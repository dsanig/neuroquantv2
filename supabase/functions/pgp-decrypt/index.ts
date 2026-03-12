import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PGP ASCII-armored detection and base64 extraction
function isAsciiArmored(data: string): boolean {
  return data.includes('-----BEGIN PGP MESSAGE-----');
}

function extractPgpPayload(data: string): string {
  const lines = data.split('\n');
  const startIdx = lines.findIndex(l => l.startsWith('-----BEGIN PGP MESSAGE-----'));
  const endIdx = lines.findIndex(l => l.startsWith('-----END PGP MESSAGE-----'));
  if (startIdx === -1 || endIdx === -1) return data;
  
  // Skip header lines (blank line separates headers from payload)
  const headerEnd = lines.indexOf('', startIdx + 1);
  const payloadLines = lines.slice(headerEnd + 1, endIdx).filter(l => l.trim() && !l.startsWith('='));
  return payloadLines.join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { encryptedData, pgpPrivateKey, passphrase, testOnly } = await req.json();

    if (testOnly) {
      // Just validate the key format
      const isValidKey = pgpPrivateKey && 
        (pgpPrivateKey.includes('-----BEGIN PGP PRIVATE KEY BLOCK-----') || 
         pgpPrivateKey.includes('-----BEGIN PGP MESSAGE-----'));
      
      return new Response(JSON.stringify({
        success: true,
        testResult: {
          keyValid: isValidKey,
          keyFormat: isValidKey ? 'ASCII-Armored' : 'Unknown',
          dataDetected: encryptedData ? isAsciiArmored(encryptedData) : false,
          message: isValidKey 
            ? 'PGP key format validated successfully'
            : 'Warning: Key does not appear to be a valid PGP private key',
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!encryptedData) {
      throw new Error('No encrypted data provided');
    }

    // Note: Full PGP decryption requires openpgp.js library.
    // For Deno edge functions, we use a simplified approach.
    // In production, you'd use: import * as openpgp from 'npm:openpgp'
    
    const isArmored = isAsciiArmored(encryptedData);
    
    if (isArmored && pgpPrivateKey) {
      // Attempt decryption using openpgp
      try {
        const openpgp = await import('https://esm.sh/openpgp@5.11.0');
        
        const privateKey = await openpgp.decryptKey({
          privateKey: await openpgp.readPrivateKey({ armoredKey: pgpPrivateKey }),
          passphrase: passphrase || '',
        });

        const message = await openpgp.readMessage({ armoredMessage: encryptedData });
        
        const { data: decrypted } = await openpgp.decrypt({
          message,
          decryptionKeys: privateKey,
        });

        return new Response(JSON.stringify({
          success: true,
          decryptedData: typeof decrypted === 'string' ? decrypted : new TextDecoder().decode(decrypted as Uint8Array),
          metadata: {
            armored: true,
            originalSize: encryptedData.length,
            decryptedSize: typeof decrypted === 'string' ? decrypted.length : (decrypted as Uint8Array).length,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (pgpError) {
        throw new Error(`PGP decryption failed: ${pgpError instanceof Error ? pgpError.message : String(pgpError)}`);
      }
    }

    // If not encrypted or no key, return data as-is
    return new Response(JSON.stringify({
      success: true,
      decryptedData: encryptedData,
      metadata: {
        armored: false,
        skipped: true,
        message: 'Data does not appear to be PGP encrypted, returned as-is',
      },
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
