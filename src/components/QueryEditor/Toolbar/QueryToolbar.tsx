import React from 'react';
import { Button, InlineField, Switch, Select, RadioButtonGroup } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

interface Props {
  format: string;
  onFormatChange: (v: SelectableValue<string>) => void;

  enableFilter: boolean;
  enableGroup: boolean;
  enableOrder: boolean;
  enablePreview: boolean;

  onToggleFilter: () => void;
  onToggleGroup: () => void;
  onToggleOrder: () => void;
  onTogglePreview: () => void;

  onRunQuery: () => void;

  mode: 'visual' | 'raw';
  onModeToggle: (mode: 'visual' | 'raw') => void;
}

const formatOptions: Array<SelectableValue<string>> = [
  { label: 'Table', value: 'table' },
  { label: 'Time series', value: 'timeseries' },
];

const modeOptions: Array<SelectableValue<'visual' | 'raw'>> = [
  { label: 'Builder', value: 'visual' },
  { label: 'Code', value: 'raw' },
];

export const QueryToolbar: React.FC<Props> = ({
  format,
  onFormatChange,
  enableFilter,
  enableGroup,
  enableOrder,
  enablePreview,
  onToggleFilter,
  onToggleGroup,
  onToggleOrder,
  onTogglePreview,
  onRunQuery,
  mode,
  onModeToggle,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '12px',
        padding: '4px 0',
      }}
    >
      <InlineField label="Format" style={{ display: 'flex', alignItems: 'center' }}>
        <Select
          width={20}
          options={formatOptions}
          value={format}
          onChange={onFormatChange}
        />
      </InlineField>

      <InlineField label="Filter" style={{ display: 'flex', alignItems: 'center' }}>
        <Switch value={enableFilter} onChange={onToggleFilter} />
      </InlineField>

      <InlineField label="Group" style={{ display: 'flex', alignItems: 'center' }}>
        <Switch value={enableGroup} onChange={onToggleGroup} />
      </InlineField>

      <InlineField label="Order" style={{ display: 'flex', alignItems: 'center' }}>
        <Switch value={enableOrder} onChange={onToggleOrder} />
      </InlineField>

      <InlineField label="Preview" style={{ display: 'flex', alignItems: 'center' }}>
        <Switch value={enablePreview} onChange={onTogglePreview} />
      </InlineField>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <Button icon="play" onClick={onRunQuery} size="sm">
          Run query
        </Button>
        <div>
          <RadioButtonGroup
            options={modeOptions}
            value={mode}
            onChange={onModeToggle}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};
