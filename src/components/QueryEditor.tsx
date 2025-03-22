import React, { ReactElement, useEffect, useState } from 'react';
import { Button, InlineField, InlineFieldRow, Select, CodeEditor } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataBricksDataSource } from '../datasource';
import { DatabricksQuery, DataBricksSourceOptions, FieldSelection } from '../types';

type Props = QueryEditorProps<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props): ReactElement {
  const [mode, setMode] = useState<'visual' | 'raw'>('raw');
  const [databases, setDatabases] = useState<Array<SelectableValue<string>>>([]);
  const [tables, setTables] = useState<Array<SelectableValue<string>>>([]);
  const [columns, setColumns] = useState<Array<SelectableValue<string>>>([]);

  const aggregations: Array<SelectableValue<string>> = [
    { label: 'COUNT', value: 'COUNT' },
    { label: 'SUM', value: 'SUM' },
    { label: 'AVG', value: 'AVG' },
    { label: 'MIN', value: 'MIN' },
    { label: 'MAX', value: 'MAX' },
  ];

  useEffect(() => {
    datasource.getResource('databases').then((dbs) =>
      setDatabases(dbs.map((db: string) => ({ label: db, value: db })))
    );
  }, [datasource]);

  useEffect(() => {
    if (query.database && query.table) {
      datasource.getResource(`columns?database=${query.database}&table=${query.table}`).then((cols) =>
        setColumns(cols.map((col: string) => ({ label: col, value: col })))
      );
    }
  }, [query.database, query.table]);

  useEffect(() => {
    if (mode === 'visual' && query.database && query.table && query.fields?.length) {
      const selections = query.fields.map((field) => {
        const expr = field.aggregation ? `${field.aggregation}(${field.column})` : field.column;
        return field.alias ? `${expr} AS ${field.alias}` : expr;
      });
      const sql = `SELECT ${selections.join(', ')} FROM ${query.database}.${query.table}`;
      onChange({ ...query, queryText: sql });
    }
  }, [query.database, query.table, query.fields, mode]);

  const onDatabaseChange = (value: SelectableValue<string>) => {
    onChange({ ...query, database: value.value, table: undefined, fields: [] });
    setTables([]);
    setColumns([]);
    datasource.getResource(`tables?database=${value.value}`).then((tbls) =>
      setTables(tbls.map((tbl: string) => ({ label: tbl, value: tbl })))
    );
  };

  const onTableChange = (value: SelectableValue<string>) => {
    onChange({ ...query, table: value.value, fields: [] });
    setColumns([]);
  };

  const addColumn = () => {
    const updated = [...(query.fields || []), { column: '', aggregation: '', alias: '' }];
    onChange({ ...query, fields: updated });
  };

  const removeColumn = (index: number) => {
    const updated = [...(query.fields || [])];
    updated.splice(index, 1);
    onChange({ ...query, fields: updated });
  };

  const updateColumnField = (index: number, field: keyof FieldSelection, value: string) => {
    const updated = [...(query.fields || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...query, fields: updated });
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setMode(mode === 'visual' ? 'raw' : 'visual')}
        style={{ marginBottom: '10px' }}
      >
        {mode === 'visual' ? 'Switch to Raw Mode' : 'Switch to Visual Mode'}
      </Button>

      {mode === 'visual' ? (
        <>
          <InlineFieldRow>
            <InlineField label="Database" grow>
              <Select options={databases} onChange={onDatabaseChange} value={query.database} />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Table" grow>
              <Select options={tables} onChange={onTableChange} value={query.table} />
            </InlineField>
          </InlineFieldRow>

          {(query.fields || []).map((col, idx) => (
            <InlineFieldRow key={idx} style={{ alignItems: 'center' }}>
              <InlineField label="Column" grow>
                <Select
                  options={columns}
                  value={col.column}
                  onChange={(v) => updateColumnField(idx, 'column', v.value!)}
                />
              </InlineField>
              <InlineField label="Aggregation (opt)" grow>
                <Select
                  options={[{ label: 'None', value: '' }, ...aggregations]}
                  value={col.aggregation || ''}
                  onChange={(v) => updateColumnField(idx, 'aggregation', v.value!)}
                />
              </InlineField>
              <InlineField label="Alias (opt)" grow>
                <input
                  type="text"
                  value={col.alias || ''}
                  onChange={(e) => updateColumnField(idx, 'alias', e.target.value)}
                  className="gf-form-input"
                />
              </InlineField>
              <Button variant="destructive" icon="trash-alt" onClick={() => removeColumn(idx)} />
            </InlineFieldRow>
          ))}

          <Button icon="plus" variant="secondary" onClick={addColumn} style={{ marginTop: 8 }}>
            Add Column
          </Button>
        </>
      ) : (
        <InlineFieldRow>
          <InlineField label="Raw SQL" grow>
            <CodeEditor
              language="sql"
              height="150px"
              value={query.queryText ?? ''}
              onBlur={(val) => {
                onChange({ ...query, queryText: val });
                onRunQuery();
              }}
              showMiniMap={false}
            />
          </InlineField>
        </InlineFieldRow>
      )}
    </>
  );
}