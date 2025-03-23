import React, { ReactElement, useEffect, useState } from 'react';
import { CodeEditor, InlineField, InlineFieldRow, Alert } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataBricksDataSource } from '../datasource';
import { DatabricksQuery, DataBricksSourceOptions, FieldSelection } from '../types';
import { QueryToolbar } from './QueryBarTool';
import { DatabaseTableSelector } from './DatabaseTableSelector';
import { ColumnBuilder } from './ColumnBuilder';
import { QueryPreview } from './QueryPreview';
import { OrderBuilder } from './OrderBuilder';

interface Props extends QueryEditorProps<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions> { }

export function QueryEditor({ datasource, query, onChange, onRunQuery, data }: Props): ReactElement {
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getDuplicateColumns = (): string[] => {
    const cols = query.fields
      ?.map((f) => f.alias?.trim() || f.column?.trim())
      .filter((col): col is string => Boolean(col)) || [];
  
    const seen = new Set<string>();
    const duplicates = new Set<string>();
  
    for (const col of cols) {
      if (seen.has(col)) {
        duplicates.add(col);
      } else {
        seen.add(col);
      }
    }
  
    return Array.from(duplicates);
  };
  

  const handleRunQuery = () => {
    if (mode === 'visual') {
      const duplicates = getDuplicateColumns();
  
      if (duplicates.length > 0) {
        const formatted = duplicates.map((d) => `"${d}"`).join(', ');
        setErrorMessage(`duplicate column names are not allowed, found identical name: ${formatted}. use aliases for that.`);
        return;
      }
    }
  
    setErrorMessage(null);
    onRunQuery();
  };
  
  

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
        setColumns([{ label: '*', value: '*' }, ...cols.map((col: string) => ({ label: col, value: col }))])
      );
    }
  }, [query.database, query.table]);

  useEffect(() => {
    if (mode === 'visual' && query.database && query.table && query.fields?.length) {
      const selections = query.fields.map((f) => {
        if (f.column === '*') {
          return f.aggregation === 'COUNT' ? `COUNT(*)` : '*';
        }
        const expr = f.aggregation ? `${f.aggregation}(${f.column})` : f.column;
        return f.alias ? `${expr} AS ${f.alias}` : expr;
      });

      let sql = `SELECT ${selections.join(', ')} FROM ${query.database}.${query.table}`;

      if (query.enableOrder) {
        if (query.orderBy) {
          sql += ` ORDER BY ${query.orderBy} ${query.orderDirection ?? 'ASC'}`;
        }

        if (query.limit) {
          sql += ` LIMIT ${query.limit}`;
        }
      }



      onChange({ ...query, queryText: sql });
    }
  }, [query.database, query.table, query.fields, query.enableOrder, query.orderBy, query.orderDirection, query.limit, mode]);


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
    const updated = [...(query.fields || [])];

    if (updated.some((f) => f.column === '*')) {
      updated.push({ column: '', aggregation: '', alias: '' });
    } else {
      updated.push({ column: '*', aggregation: '', alias: '' });
    }

    onChange({ ...query, fields: updated });
  };

  const removeField = (index: number) => {
    const updated = [...(query.fields || [])];
    updated.splice(index, 1);
    onChange({ ...query, fields: updated });
  };

  const handleFormatChange = (v: SelectableValue<string>) => {
    setFormat(v.value ?? 'table');
    onChange({ ...query, format: v.value ?? 'table' });
  };

  const handleToggleFilter = () => {
    const value = !enableFilter;
    setEnableFilter(value);
    onChange({ ...query, enableFilter: value });
  };

  const handleToggleGroup = () => {
    const value = !enableGroup;
    setEnableGroup(value);
    onChange({ ...query, enableGroup: value });
  };

  const handleToggleOrder = () => {
    const value = !enableOrder;
    setEnableOrder(value);
    onChange({ ...query, enableOrder: value });
  };

  const handleTogglePreview = () => {
    const value = !enablePreview;
    setEnablePreview(value);
    onChange({ ...query, enablePreview: value });
  };

  const handleModeToggle = (selectedMode: 'visual' | 'raw') => {
    setMode(selectedMode);
  };

  return (
    <>

      <QueryToolbar
        format={format}
        onFormatChange={handleFormatChange}
        enableFilter={enableFilter}
        enableGroup={enableGroup}
        enableOrder={enableOrder}
        enablePreview={enablePreview}
        onToggleFilter={handleToggleFilter}
        onToggleGroup={handleToggleGroup}
        onToggleOrder={handleToggleOrder}
        onTogglePreview={handleTogglePreview}
        onRunQuery={handleRunQuery}
        mode={mode}
        onModeToggle={handleModeToggle}
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

          <div
            style={{
              padding: '8px',
              backgroundColor: 'rgb(34, 37, 43)',
              borderRadius: 2,
              marginTop: '8px',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            <ColumnBuilder
              fields={query.fields || []}
              columns={columns}
              aggregations={aggregations}
              onAddField={addField}
              onRemoveField={removeField}
              onChangeField={updateField}
            />
          </div>

          {query.enableOrder && (
            <OrderBuilder
              columns={columns.filter((col) => col.value !== '*')}
              orderBy={query.orderBy}
              orderDirection={(query.orderDirection === 'ASC' || query.orderDirection === 'DESC') ? query.orderDirection : undefined}
              limit={query.limit}
              onOrderByChange={(col) => onChange({ ...query, orderBy: col })}
              onOrderDirectionChange={(dir) => onChange({ ...query, orderDirection: dir })}
              onLimitChange={(limit) => onChange({ ...query, limit })}
            />
          )}

          {query.enablePreview && (
            <QueryPreview sql={query.queryText ?? ''} />
          )}

          {errorMessage && <Alert title="Error" severity="error">{errorMessage}</Alert>}

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