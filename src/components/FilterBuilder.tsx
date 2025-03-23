import React from 'react';
import { InlineField, InlineFieldRow, Button, Select, Input } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { FilterCondition } from 'types';

interface Props {
    filters: FilterCondition[];
    columns: Array<SelectableValue<string>>;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, key: keyof FilterCondition, value: string) => void;
}

export const operatorOptions: Array<SelectableValue<string>> = [
    { label: '=', value: '=' },
    { label: '!=', value: '!=' },
    { label: '<', value: '<' },
    { label: '<=', value: '<=' },
    { label: '>', value: '>' },
    { label: '>=', value: '>=' },
    { label: 'LIKE', value: 'LIKE' },
    { label: 'NOT LIKE', value: 'NOT LIKE' },
    { label: 'ILIKE', value: 'ILIKE' },
    { label: 'NOT ILIKE', value: 'NOT ILIKE' },
    { label: 'IN', value: 'IN' },
    { label: 'NOT IN', value: 'NOT IN' },
    { label: 'BETWEEN', value: 'BETWEEN' },
    { label: 'IS NULL', value: 'IS NULL' },
    { label: 'IS NOT NULL', value: 'IS NOT NULL' },
    { label: 'EXISTS', value: 'EXISTS' },
    { label: 'NOT EXISTS', value: 'NOT EXISTS' },
    { label: 'ANY/SOME', value: 'ANY' },
    { label: 'ALL', value: 'ALL' },
    { label: 'REGEXP', value: 'REGEXP' },
    { label: 'RLIKE', value: 'RLIKE' },
];

export const FilterBuilder: React.FC<Props> = ({
    filters,
    columns,
    onAdd,
    onRemove,
    onChange,
}) => {
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

            {filters.map((filter, idx) => (
                <InlineFieldRow key={idx} style={{ alignItems: 'center' }}>
                    {idx > 0 && (
                        <InlineField label="Condition">
                            <Select
                                options={[
                                    { label: 'AND', value: 'AND' },
                                    { label: 'OR', value: 'OR' },
                                ]}
                                value={filter.condition || 'AND'}
                                onChange={(v) => onChange(idx, 'condition', v.value!)}
                                width={12}
                            />
                        </InlineField>
                    )}

                    <InlineField label="Column">
                        <Select
                            options={columns}
                            value={filter.column}
                            onChange={(v) => onChange(idx, 'column', v.value!)}
                            width={20}
                        />
                    </InlineField>

                    <InlineField label="Operator">
                        <Select
                            options={operatorOptions}
                            value={filter.operator}
                            onChange={(v) => onChange(idx, 'operator', v.value!)}
                            width={15}
                        />
                    </InlineField>

                    <InlineField label="Value">
                        <Input
                            value={filter.value}
                            onChange={(e) => onChange(idx, 'value', e.currentTarget.value)}
                            width={20}
                        />
                    </InlineField>

                    <Button
                        icon="trash-alt"
                        variant="destructive"
                        onClick={() => onRemove(idx)}
                    />
                </InlineFieldRow>
            ))}


            <Button icon="plus" variant="secondary" onClick={onAdd} style={{ marginTop: 8 }}>
                Add Filter
            </Button>
        </div>
    );
};
