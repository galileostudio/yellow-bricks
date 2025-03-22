import React, { ReactElement, useEffect, useState } from 'react';
import { Button, InlineField, InlineFieldRow, Select, TextArea, CodeEditor } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataBricksDataSource } from '../datasource';
import { DatabricksQuery, DataBricksSourceOptions } from '../types';

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

  // Load databases on mount
  useEffect(() => {
    datasource.getResource('databases').then((dbs) =>
      setDatabases(dbs.map((db: string) => ({ label: db, value: db })))
    );
  }, [datasource]);

  // Update queryText when using visual mode
  useEffect(() => {
    if (mode === 'visual' && query.database && query.table && query.column && query.aggregation) {
      const sql = `SELECT ${query.aggregation}(${query.column}) FROM ${query.database}.${query.table}`;
      onChange({ ...query, queryText: sql });
    }
  }, [query.database, query.table, query.column, query.aggregation, mode]);

  const onDatabaseChange = (value: SelectableValue<string>) => {
    onChange({ ...query, database: value.value, table: undefined, column: undefined });
    setTables([]);
    setColumns([]);

    datasource.getResource(`tables?database=${value.value}`).then((tbls) =>
      setTables(tbls.map((tbl: string) => ({ label: tbl, value: tbl })))
    );
  };

  const onTableChange = (value: SelectableValue<string>) => {
    onChange({ ...query, table: value.value, column: undefined });
    setColumns([]);

    if (query.database) {
      datasource.getResource(`columns?database=${query.database}&table=${value.value}`).then((cols) =>
        setColumns(cols.map((col: string) => ({ label: col, value: col })))
      );
    }
  };

  const onColumnChange = (value: SelectableValue<string>) => {
    onChange({ ...query, column: value.value });
  };

  const onAggregationChange = (value: SelectableValue<string>) => {
    onChange({ ...query, aggregation: value.value });
  };

  // const onRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   onChange({ ...query, queryText: e.currentTarget.value });
  // };

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

          <InlineFieldRow>
            <InlineField label="Column" grow>
              <Select options={columns} onChange={onColumnChange} value={query.column} />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Aggregation" grow>
              <Select options={aggregations} onChange={onAggregationChange} value={query.aggregation} />
            </InlineField>
          </InlineFieldRow>
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
