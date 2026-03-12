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
    const { sourceId, fileContent, fileName } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get source
    const { data: source, error: sourceError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`);
    }

    // Find matching parser profile
    const { data: profiles } = await supabase
      .from('parser_profiles')
      .select('*');

    const matchingProfile = (profiles || []).find(p => {
      if (!p.source_pattern || p.source_pattern === '*') return true;
      const regex = new RegExp(p.source_pattern.replace(/\*/g, '.*'));
      return regex.test(fileName || '');
    });

    if (!matchingProfile) {
      throw new Error('No matching parser profile found for this file');
    }

    let processedContent = fileContent;

    // Step 1: PGP Decryption (if source is encrypted)
    if (source.encrypted && fileContent.includes('-----BEGIN PGP MESSAGE-----')) {
      console.log('Attempting PGP decryption...');
      
      // Call pgp-decrypt function
      const decryptResponse = await fetch(`${supabaseUrl}/functions/v1/pgp-decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          encryptedData: fileContent,
          pgpPrivateKey: source.pgp_key_ref,
          passphrase: source.pgp_passphrase_ref,
        }),
      });

      const decryptResult = await decryptResponse.json();
      if (!decryptResult.success) {
        // Log decryption failure
        await supabase.from('audit_log').insert({
          actor: 'system',
          event_type: 'import.decrypt_failed',
          entity_type: 'data_source',
          entity_id: sourceId,
          source: 'edge-function',
          metadata: { error: decryptResult.error },
        });
        throw new Error(`PGP decryption failed: ${decryptResult.error}`);
      }
      
      processedContent = decryptResult.decryptedData;
    }

    // Step 2: Parse and map
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        fileContent: processedContent,
        profileId: matchingProfile.id,
        sourceId,
        dryRun: false,
      }),
    });

    const parseResult = await parseResponse.json();

    return new Response(JSON.stringify({
      success: parseResult.success,
      pipeline: {
        decrypted: source.encrypted,
        parsed: true,
        profileUsed: matchingProfile.name,
      },
      ...parseResult,
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
