import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  error?: string;
}

function parseCSV(content: string, delimiter: string, headerRow: number, skipRows: number, skipCondition?: string): ParsedRow[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rows: ParsedRow[] = [];
  
  if (lines.length === 0) return rows;

  // Get headers
  const headerIdx = headerRow - 1 + skipRows;
  if (headerIdx >= lines.length) return rows;
  
  const headers = parseLine(lines[headerIdx], delimiter);
  
  // Parse data rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Apply skip condition
    if (skipCondition && line.startsWith('#')) continue;
    
    try {
      const values = parseLine(line, delimiter);
      const data: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        data[header] = idx < values.length ? values[idx] : '';
      });
      
      rows.push({ rowNumber: i + 1, data });
    } catch (e) {
      rows.push({ 
        rowNumber: i + 1, 
        data: {}, 
        error: e instanceof Error ? e.message : 'Parse error' 
      });
    }
  }
  
  return rows;
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function parseXML(content: string): ParsedRow[] {
  // Simple XML parser for flat structures
  const rows: ParsedRow[] = [];
  const rowPattern = /<(\w+Row|FlexStatement|OpenPosition|Trade)([^>]*)\/?>(?:([\s\S]*?)<\/\1>)?/g;
  let match;
  let rowNum = 1;
  
  while ((match = rowPattern.exec(content)) !== null) {
    const data: Record<string, string> = {};
    // Parse attributes
    const attrPattern = /(\w+)="([^"]*)"/g;
    let attrMatch;
    const attrs = match[2] || '';
    while ((attrMatch = attrPattern.exec(attrs)) !== null) {
      data[attrMatch[1]] = attrMatch[2];
    }
    
    if (Object.keys(data).length > 0) {
      rows.push({ rowNumber: rowNum++, data });
    }
  }
  
  return rows;
}

function applyTransform(value: string, transform: string, dateFormat: string, numericFormat: string): string {
  if (!transform) return value;
  
  if (transform.startsWith('parseDate')) {
    // Validate date format
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
    return d.toISOString().split('T')[0];
  }
  
  if (transform.startsWith('toDecimal')) {
    const cleaned = numericFormat === 'US' 
      ? value.replace(/,/g, '') 
      : value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
    const precision = parseInt(transform.match(/\d+/)?.[0] || '2');
    return num.toFixed(precision);
  }
  
  if (transform.startsWith('abs')) {
    const inner = transform.replace(/^abs\(/, '').replace(/\)$/, '');
    const result = applyTransform(value, inner, dateFormat, numericFormat);
    return Math.abs(parseFloat(result)).toString();
  }
  
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, profileId, dryRun, sourceId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get parser profile
    const { data: profile, error: profileError } = await supabase
      .from('parser_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Parser profile not found: ${profileError?.message}`);
    }

    // Get mapping rules for this profile
    const { data: mappings, error: mappingError } = await supabase
      .from('mapping_rules')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order');

    if (mappingError) {
      throw new Error(`Failed to load mapping rules: ${mappingError.message}`);
    }

    // Parse based on file type
    let parsedRows: ParsedRow[];
    if (profile.file_type === 'XML') {
      parsedRows = parseXML(fileContent);
    } else {
      parsedRows = parseCSV(
        fileContent, 
        profile.delimiter, 
        profile.header_row, 
        profile.skip_rows,
        profile.skip_condition || undefined
      );
    }

    // Apply mapping rules
    const errors: Array<{ row: number; field: string; message: string; value: string }> = [];
    const normalizedRecords: Array<{ destination_table: string; mapped_data: Record<string, unknown>; validation_status: string; validation_errors?: unknown }> = [];
    
    // Group mappings by destination table
    const mappingsByTable: Record<string, typeof mappings> = {};
    (mappings || []).forEach(m => {
      if (!mappingsByTable[m.destination_table]) mappingsByTable[m.destination_table] = [];
      mappingsByTable[m.destination_table].push(m);
    });

    for (const row of parsedRows) {
      if (row.error) {
        errors.push({ row: row.rowNumber, field: 'parse', message: row.error, value: '' });
        continue;
      }

      for (const [table, tableMappings] of Object.entries(mappingsByTable)) {
        const mappedData: Record<string, unknown> = {};
        let rowValid = true;
        const rowErrors: string[] = [];

        for (const mapping of tableMappings) {
          const sourceValue = row.data[mapping.source_field];
          
          // Check required
          if (mapping.required && (!sourceValue || sourceValue === '')) {
            errors.push({
              row: row.rowNumber,
              field: mapping.source_field,
              message: `Required field missing: ${mapping.source_field}`,
              value: '',
            });
            rowValid = false;
            continue;
          }

          if (sourceValue === undefined || sourceValue === '') {
            mappedData[mapping.target_field] = mapping.default_value || null;
            continue;
          }

          // Apply transform
          try {
            const transformed = applyTransform(
              sourceValue, 
              mapping.transform || '', 
              profile.date_format, 
              profile.numeric_format
            );
            mappedData[mapping.target_field] = transformed;
          } catch (e) {
            errors.push({
              row: row.rowNumber,
              field: mapping.source_field,
              message: e instanceof Error ? e.message : 'Transform error',
              value: sourceValue,
            });
            rowValid = false;
          }
        }

        if (Object.keys(mappedData).length > 0) {
          normalizedRecords.push({
            destination_table: table,
            mapped_data: mappedData,
            validation_status: rowValid ? 'valid' : 'error',
            validation_errors: rowValid ? undefined : rowErrors,
          });
        }
      }
    }

    // Get source name
    let sourceName = 'Manual Upload';
    if (sourceId) {
      const { data: source } = await supabase.from('data_sources').select('name').eq('id', sourceId).single();
      if (source) sourceName = source.name;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        totalRows: parsedRows.length,
        parsedPreview: parsedRows.slice(0, 10),
        normalizedPreview: normalizedRecords.slice(0, 10),
        errorCount: errors.length,
        errors: errors.slice(0, 20),
        mappingsApplied: (mappings || []).length,
        tablesTargeted: Object.keys(mappingsByTable),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create import batch
    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        source_id: sourceId || null,
        source_name: sourceName,
        file_name: `upload_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        parser_profile_id: profileId,
        parser_profile_name: profile.name,
        mapping_version: `v${profile.version}`,
        status: 'processing',
        total_rows: parsedRows.length,
        triggered_by: 'manual',
        raw_file_data: fileContent.substring(0, 100000), // Store up to 100KB
      })
      .select()
      .single();

    if (batchError || !batch) {
      throw new Error(`Failed to create import batch: ${batchError?.message}`);
    }

    // Store raw rows
    const rawRowInserts = parsedRows.map(r => ({
      batch_id: batch.id,
      row_number: r.rowNumber,
      raw_data: r.data,
    }));

    if (rawRowInserts.length > 0) {
      // Insert in chunks of 100
      for (let i = 0; i < rawRowInserts.length; i += 100) {
        await supabase.from('raw_rows').insert(rawRowInserts.slice(i, i + 100));
      }
    }

    // Store normalized records
    if (normalizedRecords.length > 0) {
      const normalizedInserts = normalizedRecords.map(r => ({
        batch_id: batch.id,
        destination_table: r.destination_table,
        mapped_data: r.mapped_data,
        validation_status: r.validation_status,
        validation_errors: r.validation_errors || null,
      }));

      for (let i = 0; i < normalizedInserts.length; i += 100) {
        await supabase.from('normalized_records').insert(normalizedInserts.slice(i, i + 100));
      }
    }

    // Store errors
    if (errors.length > 0) {
      const errorInserts = errors.map(e => ({
        batch_id: batch.id,
        row_number: e.row,
        field: e.field,
        message: e.message,
        value: e.value,
      }));
      await supabase.from('import_errors').insert(errorInserts);
    }

    // Update batch status
    const importedRows = parsedRows.length - errors.length;
    await supabase.from('import_batches').update({
      status: errors.length === parsedRows.length ? 'failed' : errors.length > 0 ? 'partial' : 'completed',
      imported_rows: importedRows,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    }).eq('id', batch.id);

    // Audit log
    await supabase.from('audit_log').insert({
      actor: 'system',
      event_type: errors.length > 0 ? 'import.partial' : 'import.completed',
      entity_type: 'import_batch',
      entity_id: batch.id,
      source: 'edge-function',
      metadata: { rows: parsedRows.length, errors: errors.length, tables: Object.keys(mappingsByTable) },
    });

    return new Response(JSON.stringify({
      success: true,
      batchId: batch.id,
      totalRows: parsedRows.length,
      importedRows,
      errorRows: errors.length,
      errors: errors.slice(0, 50),
      tablesTargeted: Object.keys(mappingsByTable),
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
