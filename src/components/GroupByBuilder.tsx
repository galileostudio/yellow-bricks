import React from 'react';
import { InlineField, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

interface Props {
  columns: Array<SelectableValue<string>>;
  selected: string[];
  onChange: (columns: string[]) => void;
}

export const GroupByBuilder: React.FC<Props> = ({ columns, selected, onChange }) => {
  const handleChange = (selectedValues: Array<SelectableValue<string>>) => {
    const values = selectedValues.map((v) => v.value!).filter(Boolean);
    onChange(values);
  };

  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: 'rgb(34, 37, 43)',
        borderRadius: 2,
        marginTop: '8px',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      }}
    >
      <InlineField label="Group by">
        <MultiSelect
          options={columns}
          value={selected}
          onChange={handleChange}
          placeholder="Select columns"
          width={40}
        />
      </InlineField>
    </div>
  );
};
