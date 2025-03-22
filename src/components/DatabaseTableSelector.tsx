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
    <div
            style={{
              padding: '8px',
              backgroundColor: 'rgb(34, 37, 43)',
              borderRadius: 2,
              marginTop: '8px',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
              display: 'flex',
            }}
          >
                
      <InlineField label="Database" labelWidth={8}>
        <Select
          options={databases}
          value={database}
          onChange={onDatabaseChange}
          placeholder="Select database"
          width={25}
        />
      </InlineField>

      <InlineField label="Table" labelWidth={6}>
        <Select
          options={tables}
          value={table}
          onChange={onTableChange}
          placeholder="Select table"
          width={25}
        />
      </InlineField>
    </div>
  );
};
