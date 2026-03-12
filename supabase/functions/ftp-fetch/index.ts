import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get source config
    const { data: source, error: sourceError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`);
    }

    // Connect to FTP
    const port = source.port || 21;
    let files: string[] = [];
    let rawData = '';

    try {
      const conn = await Deno.connect({ hostname: source.host, port });
      
      // Read banner
      const bannerBuf = new Uint8Array(1024);
      await conn.read(bannerBuf);
      
      // Send USER command
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      await conn.write(encoder.encode(`USER ${source.username}\r\n`));
      const userBuf = new Uint8Array(1024);
      await conn.read(userBuf);
      
      // Send PASS command (use password_ref as password for now)
      if (source.password_ref) {
        await conn.write(encoder.encode(`PASS ${source.password_ref}\r\n`));
        const passBuf = new Uint8Array(1024);
        await conn.read(passBuf);
      }
      
      // Send PASV for passive mode
      await conn.write(encoder.encode(`PASV\r\n`));
      const pasvBuf = new Uint8Array(1024);
      const pasvN = await conn.read(pasvBuf);
      const pasvResp = decoder.decode(pasvBuf.subarray(0, pasvN || 0));
      
      // Parse PASV response to get data port
      const pasvMatch = pasvResp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
      
      if (pasvMatch) {
        const dataPort = parseInt(pasvMatch[5]) * 256 + parseInt(pasvMatch[6]);
        
        // Open data connection
        const dataConn = await Deno.connect({ hostname: source.host, port: dataPort });
        
        // Send LIST command
        await conn.write(encoder.encode(`LIST ${source.remote_path}\r\n`));
        
        // Read directory listing from data connection
        const listBuf = new Uint8Array(8192);
        const listN = await dataConn.read(listBuf);
        const listing = decoder.decode(listBuf.subarray(0, listN || 0));
        
        // Parse file listing  
        files = listing.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            const parts = line.split(/\s+/);
            return parts[parts.length - 1];
          })
          .filter(name => {
            if (!source.filename_pattern || source.filename_pattern === '*') return true;
            const regex = new RegExp(source.filename_pattern.replace(/\*/g, '.*'));
            return regex.test(name);
          });

        dataConn.close();
        
        // If files found, try to retrieve the first matching file
        if (files.length > 0) {
          // Send another PASV for file retrieval
          await conn.write(encoder.encode(`PASV\r\n`));
          const pasv2Buf = new Uint8Array(1024);
          const pasv2N = await conn.read(pasv2Buf);
          const pasv2Resp = decoder.decode(pasv2Buf.subarray(0, pasv2N || 0));
          const pasv2Match = pasv2Resp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
          
          if (pasv2Match) {
            const dataPort2 = parseInt(pasv2Match[5]) * 256 + parseInt(pasv2Match[6]);
            const dataConn2 = await Deno.connect({ hostname: source.host, port: dataPort2 });
            
            const filePath = source.remote_path.endsWith('/') 
              ? `${source.remote_path}${files[0]}` 
              : `${source.remote_path}/${files[0]}`;
              
            // TYPE I for binary
            await conn.write(encoder.encode(`TYPE I\r\n`));
            const typeBuf = new Uint8Array(256);
            await conn.read(typeBuf);
            
            await conn.write(encoder.encode(`RETR ${filePath}\r\n`));
            
            // Read file data
            const chunks: Uint8Array[] = [];
            let totalSize = 0;
            while (true) {
              const chunk = new Uint8Array(65536);
              const n = await dataConn2.read(chunk);
              if (n === null) break;
              chunks.push(chunk.subarray(0, n));
              totalSize += n;
              if (totalSize > 10 * 1024 * 1024) break; // 10MB limit
            }
            
            dataConn2.close();
            
            // Combine chunks
            const combined = new Uint8Array(totalSize);
            let offset = 0;
            for (const chunk of chunks) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            
            rawData = new TextDecoder().decode(combined);
          }
        }
      }
      
      // Send QUIT
      await conn.write(encoder.encode(`QUIT\r\n`));
      conn.close();

      // Update source status
      await supabase.from('data_sources').update({
        last_connected_at: new Date().toISOString(),
        last_status: 'connected',
        last_error: null,
      }).eq('id', sourceId);

    } catch (ftpError) {
      const errMsg = ftpError instanceof Error ? ftpError.message : String(ftpError);
      
      await supabase.from('data_sources').update({
        last_status: 'error',
        last_error: errMsg,
      }).eq('id', sourceId);

      throw new Error(`FTP error: ${errMsg}`);
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      actor: 'system',
      event_type: 'source.fetch',
      entity_type: 'data_source',
      entity_id: sourceId,
      source: 'edge-function',
      metadata: { files_found: files.length, file_names: files },
    });

    return new Response(JSON.stringify({
      success: true,
      files,
      fileCount: files.length,
      rawDataPreview: rawData ? rawData.substring(0, 2000) : null,
      rawDataLength: rawData.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
