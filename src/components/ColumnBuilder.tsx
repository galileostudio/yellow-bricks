import React from 'react';
import { InlineField, InlineFieldRow, Button, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { FieldSelection } from '../types';

export interface ColumnSelection {
    column?: string;
    aggregation?: string;
    alias?: string;
}

export interface Props {
    fields: FieldSelection[];
    columns: Array<SelectableValue<string>>;
    aggregations: Array<SelectableValue<string>>;
    onAddField: () => void;
    onRemoveField: (index: number) => void;
    onChangeField: (index: number, key: keyof FieldSelection, value: string) => void;
}

export const ColumnBuilder: React.FC<Props> = ({ columns, aggregations, fields, onAddField, onRemoveField, onChangeField }) => {
    return (
        <>
            {fields.map((col, idx) => (
                <InlineFieldRow key={idx} style={{ alignItems: 'center' }}>
                    <InlineField label="Column" grow>
                        <Select
                            options={columns}
                            value={col.column}
                            onChange={(v) => onChangeField(idx, 'column', v.value!)}
                        />
                    </InlineField>
                    <InlineField label="Aggregation - optional" grow>
                        <Select
                            options={[{ label: 'None', value: '' }, ...aggregations]}
                            value={col.aggregation || ''}
                            onChange={(v) => onChangeField(idx, 'aggregation', v.value!)}
                            isOptionDisabled={(opt) => col.column === '*' && opt.value !== '' && opt.value !== 'COUNT'}

                        />
                    </InlineField>
                    <InlineField label="Alias - optional" grow>
                        <input
                            type="text"
                            className="gf-form-input"
                            value={col.alias || ''}
                            onChange={(e) => onChangeField(idx, 'alias', e.target.value)}
                        />
                    </InlineField>
                    <Button variant="destructive" icon="trash-alt" onClick={() => onRemoveField(idx)} />
                </InlineFieldRow>
            ))}
            <Button icon="plus" variant="secondary" onClick={onAddField} style={{ marginTop: 8 }}>
                Add Column
            </Button>
        </>
    );
};
