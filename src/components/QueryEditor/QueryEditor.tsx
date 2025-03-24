import React, { ReactElement, useEffect, useState } from 'react';
import { CodeEditor, InlineField, InlineFieldRow } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataBricksDataSource } from '../../datasource';
import { DatabricksQuery, DataBricksSourceOptions, FieldSelection, FilterCondition } from '../../types';
import { QueryToolbar } from './Toolbar/QueryToolbar';
import { DatabaseTableSelector } from './Toolbar/DatabaseTableSelector';
import { ColumnBuilder } from './Builders/ColumnBuilder';
import { QueryPreview } from './Preview/QueryPreview';
import { OrderBuilder } from './Builders/OrderBuilder';
import { GroupByBuilder } from './Builders/GroupByBuilder';
import { FilterBuilder } from './Builders/FilterBuilder';


interface Props extends QueryEditorProps<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions> { }

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props): ReactElement {
  
  if (!query.format) {
    onChange({ ...query, format: 'table' });
    return <></>;
  }

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

  const handleGroupByChange = (columns: string[]) => {
    onChange({ ...query, groupBy: columns });
  };

  useEffect(() => {
    if (query.format !== 'table' && query.format !== 'timeseries') {
      onChange({ ...query, format: 'table' });
    }
  }, []);
  

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

      const filters = (query.filters ?? []).filter((f) => f.column && f.operator);
      let whereClause = '';

      if (query.enableFilter && filters.length > 0) {
        whereClause = ' WHERE ' + filters.map((f, idx) => {
          const logic = idx === 0 ? '' : ` ${f.condition || 'AND'} `;
          const col = f.column;
          const op = f.operator;
          const val = f.value;

          if (['IS NULL', 'IS NOT NULL'].includes(op)) {
            return `${logic}${col} ${op}`;
          }

          if (['EXISTS', 'NOT EXISTS'].includes(op)) {
            return `${logic}${op} (${val})`;
          }

          if (op === 'BETWEEN' && val?.includes('AND')) {
            return `${logic}${col} BETWEEN ${val}`;
          }

          if (['IN', 'NOT IN'].includes(op)) {
            return `${logic}${col} ${op} (${val})`;
          }

          if (['LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE', 'REGEXP', 'RLIKE'].includes(op)) {
            return `${logic}${col} ${op} '${val}'`;
          }

          if (['ANY', 'SOME', 'ALL'].includes(op)) {
            return `${logic}${col} = ${op} (${val})`;
          }

          // default binary operators (=, !=, <, etc)
          return `${logic}${col} ${op} '${val}'`;
        }).join('');
      }

      let sql = `SELECT ${selections.join(', ')} FROM ${query.database}.${query.table}`;

      if (whereClause) {
        sql += whereClause;
      }

      if (query.enableGroup && query.groupBy?.length) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }

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
  }, [query.database, query.table, query.fields, query.enableOrder, query.groupBy, query.orderBy, query.orderDirection, query.limit, query.filters, query.enableFilter, mode]);


  const onDatabaseChange = (v: SelectableValue<string>) => {
    onChange({ ...query, database: v.value, table: undefined, fields: [] });
    setTables([]);
    setColumns([]);

    datasource
      .getResource(`tables?database=${v.value}`)
      .then((tbls) => {
        setTables(tbls.map((t: string) => ({ label: t, value: t })));
      })
      .catch(() => {
        setTables([]);
        onChange({ ...query, table: undefined });
      });
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

  const addFilter = () => {
    const updated = [...(query.filters || []), { column: '', operator: '=', value: '', condition: 'AND' as "AND" }];
    onChange({ ...query, filters: updated });
  };

  const removeFilter = (index: number) => {
    const updated = [...(query.filters || [])];
    updated.splice(index, 1);
    onChange({ ...query, filters: updated });
  };

  const updateFilter = (index: number, key: keyof FilterCondition, value: string) => {
    const updated = [...(query.filters || [])];
    updated[index] = { ...updated[index], [key]: key === 'condition' ? (value as "AND" | "OR") : value };
    onChange({ ...query, filters: updated });
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
        onRunQuery={onRunQuery}
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

          {query.enableFilter && (

            <FilterBuilder
              filters={(query.filters || []).map(filter => ({ ...filter, value: filter.value || '' }))}
              columns={columns}
              onAdd={addFilter}
              onRemove={removeFilter}
              onChange={updateFilter}
            />
          )}

          {query.enableGroup && (
            <GroupByBuilder
              columns={columns}
              selected={query.groupBy ?? []}
              onChange={handleGroupByChange}
            />
          )}

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