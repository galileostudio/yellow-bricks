import React, { ReactElement, useEffect, useState } from 'react';
import { InlineField, InlineFieldRow, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataBricksDataSource } from '../datasource';
import { DatabricksQuery, DataBricksSourceOptions } from '../types';

type Props = QueryEditorProps<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props): ReactElement {
  const [databases, setDatabases] = useState<Array<SelectableValue<string>>>([]);
  const [tables, setTables] = useState<Array<SelectableValue<string>>>([]);
  const [columns, setColumns] = useState<Array<SelectableValue<string>>>([]);
  const [aggregations] = useState<Array<SelectableValue<string>>>([
    { label: 'COUNT', value: 'COUNT' },
    { label: 'SUM', value: 'SUM' },
    { label: 'AVG', value: 'AVG' },
    { label: 'MIN', value: 'MIN' },
    { label: 'MAX', value: 'MAX' },
  ]);

  useEffect(() => {
    datasource.getResource('databases').then((dbs) =>
      setDatabases(dbs.map((db: string) => ({ label: db, value: db })))
    );
  }, [datasource]);

  const onDatabaseChange = (value: SelectableValue<string>) => {
    onChange({ ...query, database: value.value });
    datasource.getResource(`tables?database=${value.value}`).then((tbls) =>
      setTables(tbls.map((tbl: string) => ({ label: tbl, value: tbl })))
    );
  };

  const onTableChange = (value: SelectableValue<string>) => {
    onChange({ ...query, table: value.value });
    datasource.getResource(`columns?table=${value.value}`).then((cols) =>
      setColumns(cols.map((col: string) => ({ label: col, value: col })))
    );
  };

  const onColumnChange = (value: SelectableValue<string>) => {
    onChange({ ...query, column: value.value });
  };

  const onAggregationChange = (value: SelectableValue<string>) => {
    onChange({ ...query, aggregation: value.value });
  };

  return (
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
  );
}
