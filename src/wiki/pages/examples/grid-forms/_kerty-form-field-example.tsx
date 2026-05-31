import { memo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAdd, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { FormArrayField, FormField, type IKertyForm, useDataWatch, useForm } from "@kerty-ui/react-forms";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx"
import { RenderCount } from "../../../components/render-count.tsx";
import { getDefaultRowData, parseValue } from "./utils.ts";
import type { GridForm, GridFormRow } from "../../../types";

const codeExample = `
import { memo, useCallback } from "react";
import { FormArrayField, FormField, useDataWatch, useForm,
 type IKertyForm } from "@kerty-ui/react-forms";
import { getDefaultRowData, parseValue } from "./utils.ts";
    
const KertyFormFieldExample = () => {
    const form = useForm<GridForm>({
        data: {
            rows: [],
        }
    });

    const prependRow = useCallback((row: GridFormRow) => {
        form.prependItems("rows", row);
    }, []);

    const appendRow = useCallback((row: GridFormRow) => {
        form.appendItems("rows", row);
    }, []);

    const appendRows = useCallback((count: number) => {
        form.appendItems("rows", Array.from({ length: count }, () => getDefaultRowData()));
    }, []);

    return (
        <article>
            <div>
                <RowCount form={form} />
            </div>
            <div>
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Cell 1</th>
                                <th>Cell 2</th>
                                <th>Cell 3</th>
                                <th>Cell 4</th>
                                <th>Cell 5</th>
                                <th>Cell 6</th>
                                <th>Cell 7</th>
                                <th>Cell 8</th>
                                <th>Cell 9</th>
                                <th>Cell 10</th>
                                <td>
                                    <button type="button" onClick={() => prependRow(getDefaultRowData())}>
                                        +
                                    </button>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <FormArrayField form={form} name="rows">
                                {
                                    ({field, removeItems}) => field.value?.map((row, index: number) => (
                                        <Row key={row.id}
                                             form={form}
                                             index={index}
                                             row={row}
                                             removeRow={removeItems}
                                        />
                                    ))
                                }
                            </FormArrayField>
                        </tbody>
                        <Footer form={form} appendRow={appendRow} />
                    </table>
                </div>
                <div>
                    <button type="button" onClick={() => appendRows(50)}>
                        Append 50 rows
                    </button>
                    <button type="button" onClick={() => appendRows(100)}>
                        Append 100 rows
                    </button>
                    <button type="button" onClick={() => form.reset()}>
                        Clear
                    </button>
                </div>
            </div>
        </article>
    )
}

const Row = memo((props: {
    index: number;
    form: IKertyForm<GridForm>;
    row: GridFormRow;
    removeRow: (index: number) => void;
}) => {
    return (
        <tr>
            <td>{props.index + 1}</td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell1\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell2\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell3\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell4\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell5\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell6\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell7\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell8\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell9\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <FormField form={props.form} name={\`rows[$\{props.index\}].cell10\`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td>
                <button type="button" onClick={() => { props.removeRow(props.index); }}>
                    x
                </button>
            </td>
        </tr>
    );
});

const Footer = (props: {
    form: IKertyForm<GridForm>;
    appendRow: (row: GridFormRow) => void;
}) => {

    const rows = useDataWatch(props.form, d => d.rows);

    let cell1 = 0;
    let cell2 = 0;
    let cell3 = 0;
    let cell4 = 0;
    let cell5 = 0;
    let cell6 = 0;
    let cell7 = 0;
    let cell8 = 0;
    let cell9 = 0;
    let cell10 = 0;

    rows?.forEach((item) => {
        cell1 += item.cell1 ?? 0;
        cell2 += item.cell2 ?? 0;
        cell3 += item.cell3 ?? 0;
        cell4 += item.cell4 ?? 0;
        cell5 += item.cell5 ?? 0;
        cell6 += item.cell6 ?? 0;
        cell7 += item.cell7 ?? 0;
        cell8 += item.cell8 ?? 0;
        cell9 += item.cell9 ?? 0;
        cell10 += item.cell10 ?? 0;
    });

    return (
        <tfoot>
            <tr>
                <td>Total</td>
                <td>{cell1}</td>
                <td>{cell2}</td>
                <td>{cell3}</td>
                <td>{cell4}</td>
                <td>{cell5}</td>
                <td>{cell6}</td>
                <td>{cell7}</td>
                <td>{cell8}</td>
                <td>{cell9}</td>
                <td>{cell10}</td>
                <td>
                    <button type="button" onClick={() => { props.appendRow(getDefaultRowData()); }}>
                        +
                    </button>
                </td>
            </tr>
        </tfoot>
    )
}

const RowCount = (props: {
    form: IKertyForm<GridForm>;
}) => {
    const rows = useDataWatch(props.form, d => d.rows);
    return <small>Row count: {rows.length}</small>;
}

`;

export const KertyFormFieldExample = () => {
    
    const form = useForm<GridForm>({
        data: {
            rows: [],
        }
    });

    const prependRow = useCallback((row: GridFormRow) => {
        form.prependItems("rows", row);
    }, []);

    const appendRow = useCallback((row: GridFormRow) => {
        form.appendItems("rows", row);
    }, []);

    const appendRows = useCallback((count: number) => {
        form.appendItems("rows", Array.from({ length: count }, () => getDefaultRowData()));
    }, []);

    return (
        <ExampleBlock
            title="Editable Grid with FormField"
            description={
                <>
                    <p>Demonstrates an editable data grid built using Kerty <b>FormArrayField</b> and <b>FormField</b> approach. Each row is wrapped in <b>memo</b> and update callbacks are stabilized with <b>useCallback</b> to avoid unnecessary re-renders.</p>
                    <p>The footer computes column totals on every render. Use the render counters to observe how changes propagate through the component tree.</p>
                </>
            }
            code={codeExample}
            preview={true}>
            <div className="mt-4 mb-2">
                <RowCount form={form} />
            </div>
            <div className="overflow-x-auto mb-4">
                <div className="max-h-120 overflow-auto rounded-md border border-border"
                     style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent' }}>
                    <table className="w-full table-fixed border-separate border-spacing-0 mb-0">
                        <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 text-left w-13">#</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 1</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 2</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 3</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 4</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 5</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 6</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 7</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 8</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 9</th>
                            <th className="bg-sidebar-accent border-b border-r border-border p-2 w-25">Cell 10</th>
                            <td className="bg-sidebar-accent border-b border-border p-2 w-10 text-center">
                                <button
                                    type="button"
                                    onClick={() => prependRow(getDefaultRowData())}
                                    className="cursor-pointer">
                                    <FontAwesomeIcon icon={faAdd} />
                                </button>
                            </td>
                        </tr>
                        </thead>
                        <tbody>
                            <FormArrayField form={form} name="rows">
                                {
                                    ({field, removeItems}) => field.value?.map((row, index: number) => (
                                        <Row key={row.id}
                                             form={form}
                                             index={index}
                                             row={row}
                                             removeRow={removeItems}
                                        />
                                    ))
                                }
                            </FormArrayField>
                        </tbody>
                        <Footer form={form} appendRow={appendRow} />
                    </table>
                </div>
                <div className="flex gap-2 pt-4">
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => appendRows(50)}>
                        Append 50 rows
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => appendRows(100)}>
                        Append 100 rows
                    </Button>
                    <Button type="button" onClick={() => form.reset()}>
                        Clear
                    </Button>
                </div>
            </div>
        </ExampleBlock>
    )
}

const Row = memo((props: {
    index: number;
    form: IKertyForm<GridForm>;
    row: GridFormRow;
    removeRow: (index: number) => void;
}) => {
    return (
        <tr className="grid-row">
            <td className="border-b border-r border-border p-2 text-muted-foreground">{props.index + 1}</td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell1`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell2`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell3`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell4`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell5`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell6`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell7`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell8`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell9`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="grid-cell">
                <FormField form={props.form} name={`rows[${props.index}].cell10`}>
                    {
                        ({field, setFieldValue}) =>
                            <>
                                <input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) => setFieldValue(parseValue(e.target.value))}
                                    className="grid-cell-input"
                                />
                                <RenderCount />
                            </>
                    }
                </FormField>
            </td>
            <td className="border-b border-border p-2 text-center">
                <button
                    type="button"
                    onClick={() => {
                        props.removeRow(props.index);
                    }}
                    className="cursor-pointer text-red-700">
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </td>
        </tr>
    );
});

const Footer = (props: {
    form: IKertyForm<GridForm>;
    appendRow: (row: GridFormRow) => void;
}) => {

    const rows = useDataWatch(props.form, d => d.rows);

    let cell1 = 0;
    let cell2 = 0;
    let cell3 = 0;
    let cell4 = 0;
    let cell5 = 0;
    let cell6 = 0;
    let cell7 = 0;
    let cell8 = 0;
    let cell9 = 0;
    let cell10 = 0;

    rows?.forEach((item) => {
        cell1 += item.cell1 ?? 0;
        cell2 += item.cell2 ?? 0;
        cell3 += item.cell3 ?? 0;
        cell4 += item.cell4 ?? 0;
        cell5 += item.cell5 ?? 0;
        cell6 += item.cell6 ?? 0;
        cell7 += item.cell7 ?? 0;
        cell8 += item.cell8 ?? 0;
        cell9 += item.cell9 ?? 0;
        cell10 += item.cell10 ?? 0;
    });

    return (
        <tfoot className="sticky bottom-0 z-10">
            <tr>
                <td className="bg-sidebar-accent border-t border-r border-border p-2 font-medium">
                    Total
                </td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell1}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell2}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell3}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell4}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell5}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell6}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell7}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell8}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell9}</td>
                <td className="bg-sidebar-accent border-t border-r border-border p-2">{cell10}</td>
                <td className="bg-sidebar-accent border-t border-border p-2 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            props.appendRow(getDefaultRowData());
                        }}
                        className="cursor-pointer">
                        <FontAwesomeIcon icon={faAdd} />
                    </button>
                </td>
            </tr>
        </tfoot>
    )
}

const RowCount = (props: {
    form: IKertyForm<GridForm>;
}) => {
    const rows = useDataWatch(props.form, d => d.rows);
    return (
        <small className="bg-primary text-primary-foreground font-semibold px-2 py-1 rounded">
            Row count: {rows.length}
        </small>
    );
}

