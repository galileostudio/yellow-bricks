import React, { ReactElement, useEffect, useState } from 'react';
import { CodeEditor, InlineField, InlineFieldRow } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataBricksDataSource } from '../datasource';
import { DatabricksQuery, DataBricksSourceOptions, FieldSelection } from '../types';
import { QueryToolbar } from './QueryBarTool';
import { DatabaseTableSelector } from './DatabaseTableSelector';
import { ColumnBuilder } from './ColumnBuilder';

interface Props extends QueryEditorProps<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions> {}

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props): ReactElement {
  const [format, setFormat] = useState<string>('table');
  const [enableFilter, setEnableFilter] = useState<boolean>(query.enableFilter ?? false);
  const [enableGroup, setEnableGroup] = useState<boolean>(query.enableGroup ?? false);
  const [enableOrder, setEnableOrder] = useState<boolean>(query.enableOrder ?? false);
  const [enablePreview, setEnablePreview] = useState<boolean>(query.enablePreview ?? true);

  const [mode, setMode] = useState<'visual' | 'raw'>(query.queryText ? 'raw' : 'visual');
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
    onChange({
      ...query,
      enableFilter,
      enableGroup,
      enableOrder,
      enablePreview,
    });
  }, [enableFilter, enableGroup, enableOrder, enablePreview]);
  

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
      const selections = query.fields.map((f) => {
        const expr = f.aggregation ? `${f.aggregation}(${f.column})` : f.column;
        return f.alias ? `${expr} AS ${f.alias}` : expr;
      });
      const sql = `SELECT ${selections.join(', ')} FROM ${query.database}.${query.table}`;
      onChange({ ...query, queryText: sql });
    }
  }, [query.database, query.table, query.fields, mode]);

  const onDatabaseChange = (v: SelectableValue<string>) => {
    onChange({ ...query, database: v.value, table: undefined, fields: [] });
    setTables([]);
    setColumns([]);
    datasource.getResource(`tables?database=${v.value}`).then((tbls) =>
      setTables(tbls.map((t: string) => ({ label: t, value: t })))
    );
  };

  const onTableChange = (v: SelectableValue<string>) => {
    onChange({ ...query, table: v.value, fields: [] });
    setColumns([]);
  };

  const updateField = (index: number, key: keyof FieldSelection, value: string) => {
    const updated = [...(query.fields || [])];
    updated[index] = { ...updated[index], [key]: value };
    onChange({ ...query, fields: updated });
  };

  const addField = () => {
    const updated = [...(query.fields || []), { column: '', aggregation: '', alias: '' }];
    onChange({ ...query, fields: updated });
  };

  const removeField = (index: number) => {
    const updated = [...(query.fields || [])];
    updated.splice(index, 1);
    onChange({ ...query, fields: updated });
  };

  return (
    <>
      <QueryToolbar
    format={format}
    onFormatChange={(v) => setFormat(v.value ?? 'table')}
    enableFilter={enableFilter}
    enableGroup={enableGroup}
    enableOrder={enableOrder}
    enablePreview={enablePreview}
    onToggleFilter={() => setEnableFilter((v) => !v)}
    onToggleGroup={() => setEnableGroup((v) => !v)}
    onToggleOrder={() => setEnableOrder((v) => !v)}
    onTogglePreview={() => setEnablePreview((v) => !v)}
    onRunQuery={onRunQuery}
    mode={mode}
    onModeToggle={(m) => setMode(m)}
  />

      {mode === 'visual' ? (
        <>
          <DatabaseTableSelector
            database={query.database}
            table={query.table}
            databases={databases}
            tables={tables}
            onDatabaseChange={onDatabaseChange}
            onTableChange={onTableChange}
          />

          <ColumnBuilder
            fields={query.fields || []}
            columns={columns}
            aggregations={aggregations}
            onAddField={addField}
            onRemoveField={removeField}
            onChangeField={updateField}
          />
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