import React from 'react';
import { InlineField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

interface Props {
  database?: string;
  table?: string;
  databases: Array<SelectableValue<string>>;
  tables: Array<SelectableValue<string>>;
  onDatabaseChange: (v: SelectableValue<string>) => void;
  onTableChange: (v: SelectableValue<string>) => void;
}

export const DatabaseTableSelector: React.FC<Props> = ({
  database,
  table,
  databases,
  tables,
  onDatabaseChange,
  onTableChange,
}) => {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <InlineField label="Database" labelWidth={16}>
        <Select
          options={databases}
          value={database}
          onChange={onDatabaseChange}
          placeholder="Select database"
          width={24}
        />
      </InlineField>

      <InlineField label="Table" labelWidth={12}>
        <Select
          options={tables}
          value={table}
          onChange={onTableChange}
          placeholder="Select table"
          width={24}
        />
      </InlineField>
    </div>
  );
};
