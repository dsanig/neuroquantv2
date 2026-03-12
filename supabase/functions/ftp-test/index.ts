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
    const { host, port, username, password, protocol } = await req.json();

    // Test FTP connection using Deno.connect
    const effectivePort = port || (protocol === 'SFTP' ? 22 : 21);
    
    let connected = false;
    let banner = '';
    let error = '';
    const startTime = Date.now();

    try {
      const conn = await Deno.connect({ hostname: host, port: effectivePort });
      
      // Read FTP banner
      const buf = new Uint8Array(1024);
      const timer = setTimeout(() => conn.close(), 5000);
      
      try {
        const n = await conn.read(buf);
        if (n) {
          banner = new TextDecoder().decode(buf.subarray(0, n)).trim();
          connected = true;
        }
      } catch (e) {
        // Connection opened but no banner (might be SFTP)
        connected = true;
        banner = `TCP connection established on port ${effectivePort}`;
      }
      
      clearTimeout(timer);
      conn.close();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const latency = Date.now() - startTime;

    // Update data source status in DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log to audit
    await supabase.from('audit_log').insert({
      actor: 'system',
      event_type: 'source.test',
      entity_type: 'data_source',
      entity_id: host,
      source: 'edge-function',
      metadata: { result: connected ? 'success' : 'failed', latency: `${latency}ms`, error },
    });

    return new Response(JSON.stringify({
      success: connected,
      banner,
      latency: `${latency}ms`,
      error: error || null,
      protocol,
      host,
      port: effectivePort,
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
