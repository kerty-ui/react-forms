import { useState } from "react";
import { Button } from "../../../components/button.tsx";
import { ExampleBlock } from "../../../components/example-block.tsx"
import { RenderCount } from "../../../components/render-count.tsx";
import type { ComplexForm } from "../../../types";

const codeExample = `

import { useState } from "react";
import { RenderCount } from "./renderCount";

type FormData = {
    firstName?: string;
    lastName?: string;
    contacts?: {
        country?: string;
        city?: string;
        address?: string;
        phoneNumbers?: string[];
    };
    documents?: {
        type?: "passport" | "id_card" | "driver_license";
        number?: string;
    }[];
};

const ReactComplexFormExample = () => {
    const [data, setData] = useState<Partial<FormData>>({});
    return (
        <article>
            <section>
                <div className="field">
                    <label>First name <RenderCount /></label>
                    <input
                        placeholder="Enter your first name"
                        value={data.firstName ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState, firstName: e.target.value 
                        }))}
                    />
                </div>
                <div className="field">
                    <label>Last name <RenderCount /></label>
                    <input
                        placeholder="Enter your last name"
                        value={data.lastName ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState, lastName: e.target.value
                        }))}
                    />
                </div>
                <div className="field">
                    <label>Country <RenderCount /></label>
                    <input
                        placeholder="Enter your country"
                        value={data.contacts?.country ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                country: e.target.value
                            }
                        }))}
                    />
                </div>
                <div className="field">
                    <label>City <RenderCount /></label>
                    <input
                        placeholder="Enter your city"
                        value={data.contacts?.city ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                city: e.target.value
                            }
                        }))}
                    />
                </div>
                <div className="field">
                    <label>Address <RenderCount /></label>
                    <input
                        placeholder="Enter your address"
                        value={data.contacts?.address ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                address: e.target.value
                            }
                        }))}
                    />
                </div>
            </section>
            <section>
                <h2>Phone numbers <RenderCount /></h2>
                {
                    data.contacts?.phoneNumbers?.map((phoneNumber, index) => (
                        <div key={index}>
                            <div className="field">
                                <input
                                    type="tel"
                                    placeholder="Enter your phone number"
                                    value={phoneNumber ?? ""}
                                    onChange={(e) => setData(prevState => ({
                                        ...prevState,
                                        contacts: {
                                            ...prevState.contacts,
                                            phoneNumbers: prevState
                                                .contacts!
                                                .phoneNumbers!
                                                .map((pn, i) => i === index 
                                                    ? e.target.value 
                                                    : pn) ?? []
                                        }
                                    }))}
                                />
                                <span><RenderCount /></span>
                            </div>
                            <button type="button"
                                    onClick={() => setData(prevState => ({
                                        ...prevState,
                                        contacts: {
                                            ...prevState.contacts,
                                            phoneNumbers: prevState
                                                .contacts!
                                                .phoneNumbers!
                                                .filter((_, i) => i !== index)
                                        }
                                    }))}>
                                Remove
                            </button>
                        </div>
                    ))
                }
                <button type="button"
                        onClick={() => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                phoneNumbers: [...prevState.contacts?.phoneNumbers ?? [], ""]
                            }
                        }))}>
                    + Add phone number
                </button>
            </section>
            <section>
                <h2>Documents <RenderCount /></h2>
                {
                    data.documents?.map((document, index) => (
                        <div key={index}>
                            <div className="field">
                                <select
                                    value={document?.type ?? ""}
                                    onChange={(e) => setData(prevState => ({
                                        ...prevState,
                                        documents: prevState
                                            .documents!
                                            .map((doc, i) => i === index 
                                                ? ({ ...doc, type: e.target.value } as any) 
                                                : doc) ?? []
                                    }))}>
                                    <option value="">Select document type</option>
                                    <option value="passport">Passport</option>
                                    <option value="id_card">ID card</option>
                                    <option value="driver_license">Driver license</option>
                                </select>
                                <span><RenderCount /></span>
                            </div>
                            <div className="field">
                                <input
                                    placeholder="Enter document number"
                                    value={document.number ?? ""}
                                    onChange={(e) => setData(prevState => ({
                                        ...prevState,
                                        documents: prevState
                                            .documents!
                                            .map((doc, i) => i === index 
                                                ? ({ ...doc, number: e.target.value } as any) 
                                                : doc) ?? []
                                    }))}
                                />
                                <span><RenderCount /></span>
                            </div>
                            <button type="button"
                                    onClick={() => setData(prevState => ({
                                        ...prevState,
                                        documents: prevState
                                            .documents!
                                            .filter((_, i) => i !== index),
                                    }))}>
                                Remove
                            </button>
                        </div>
                    ))
                }
                <nav>
                    <button type="button"
                            onClick={() => setData(prevState => ({
                                ...prevState,
                                documents: [...prevState.documents ?? [], {}],
                            }))}>
                        + Add document
                    </button>
                    <button type="button"
                            onClick={() => setData(prevState => ({
                                ...prevState,
                                documents: [
                                    { type: "id_card", number: "ID123456" },
                                    { type: "passport", number: "PP123456" }
                                ],
                            }))}>
                        Reload documents
                    </button>
                    <button type="button"
                            onClick={() => setData(prevState => ({
                                ...prevState,
                                documents: [],
                            }))}>
                        Clear documents
                    </button>
                </nav>
            </section>
            <button type="button" onClick={() => setData({})}>
                Reset
            </button>
            <section>
                <p>Form data <RenderCount /></p>
                <pre>{JSON.stringify(state, null, 2)}</pre>
            </section>
        </article>
    );
}
`;

export const ReactFormExample = () => {
    const [data, setData] = useState<ComplexForm>({});
    return (
        <ExampleBlock
            title="Complex form using useState"
            description="Here is a simple example of how to manage a complex form with nested objects and array fields using useState."
            code={codeExample}>
            <section>
                <div className="field">
                    <label>First name <RenderCount /></label>
                    <input
                        placeholder="Enter your first name"
                        value={data.firstName ?? ""}
                        onChange={(e) => setData(prevState => ({ ...prevState, firstName: e.target.value }))}
                    />
                </div>
                <div className="field">
                    <label>Last name <RenderCount /></label>
                    <input
                        placeholder="Enter your last name"
                        value={data.lastName ?? ""}
                        onChange={(e) => setData(prevState => ({ ...prevState, lastName: e.target.value }))}
                    />
                </div>
                <div className="field">
                    <label>Country <RenderCount /></label>
                    <input
                        placeholder="Enter your country"
                        value={data.contacts?.country ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                country: e.target.value
                            }
                        }))}
                    />
                </div>
                <div className="field">
                    <label>City <RenderCount /></label>
                    <input
                        placeholder="Enter your city"
                        value={data.contacts?.city ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                city: e.target.value
                            }
                        }))}
                    />
                </div>
                <div className="field">
                    <label>Address <RenderCount /></label>
                    <input
                        placeholder="Enter your address"
                        value={data.contacts?.address ?? ""}
                        onChange={(e) => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                address: e.target.value
                            }
                        }))}
                    />
                </div>
            </section>
            <section className="mt-4 mb-6">
                <h3 className="flex items-center justify-between mb-2">
                    <span className="uppercase text-sm">Phone numbers</span>
                    <RenderCount />
                </h3>
                {
                    data.contacts?.phoneNumbers?.map((phoneNumber, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="field flex-1 flex items-center gap-2 mb-2">
                                <input
                                    type="tel"
                                    placeholder="Enter your phone number"
                                    value={phoneNumber ?? ""}
                                    onChange={(e) => setData(prevState => ({
                                        ...prevState,
                                        contacts: {
                                            ...prevState.contacts,
                                            phoneNumbers: prevState
                                                .contacts!
                                                .phoneNumbers!
                                                .map((pn, i) => i === index ? e.target.value : pn) ?? []
                                        }
                                    }))}
                                    className="mb-0!"
                                />
                                <span className="text-nowrap w-20"><RenderCount /></span>
                            </div>
                            <Button type="button" variant="danger" outlined="dashed"
                                    onClick={() => setData(prevState => ({
                                        ...prevState,
                                        contacts: {
                                            ...prevState.contacts,
                                            phoneNumbers: prevState
                                                .contacts!
                                                .phoneNumbers!
                                                .filter((_, i) => i !== index)
                                        }
                                    }))}>
                                Remove
                            </Button>
                        </div>
                    ))
                }
                <Button type="button" variant="primary" outlined="dashed"
                        onClick={() => setData(prevState => ({
                            ...prevState,
                            contacts: {
                                ...prevState.contacts,
                                phoneNumbers: [...prevState.contacts?.phoneNumbers ?? [], ""]
                            }
                        }))}>
                    + Add phone number
                </Button>
            </section>
            <section className="mt-4 mb-6">
                <h3 className="flex items-center justify-between mb-2">
                    <span className="uppercase text-sm">Documents</span>
                    <RenderCount />
                </h3>
                {
                    data.documents?.map((document, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="field flex-1 flex items-center gap-2 mb-2">
                                <select
                                    value={document?.type ?? ""}
                                    onChange={(e) => setData(prevState => ({
                                        ...prevState,
                                        documents: prevState
                                            .documents!
                                            .map((doc, i) => i === index ? ({ ...doc, type: e.target.value } as any) : doc) ?? []
                                    }))}>
                                    <option value="">Select document type</option>
                                    <option value="passport">Passport</option>
                                    <option value="id_card">ID card</option>
                                    <option value="driver_license">Driver license</option>
                                </select>
                                <span className="text-nowrap w-20"><RenderCount /></span>
                            </div>
                            <div className="field flex-1 flex items-center gap-2 mb-2">
                                <input
                                    placeholder="Enter document number"
                                    value={document.number ?? ""}
                                    onChange={(e) => setData(prevState => ({
                                        ...prevState,
                                        documents: prevState
                                            .documents!
                                            .map((doc, i) => i === index ? ({ ...doc, number: e.target.value } as any) : doc) ?? []
                                    }))}
                                />
                                <span className="text-nowrap w-20"><RenderCount /></span>
                            </div>
                            <Button type="button" variant="danger" outlined="dashed"
                                    onClick={() => setData(prevState => ({
                                        ...prevState,
                                        documents: prevState
                                            .documents!
                                            .filter((_, i) => i !== index),
                                    }))}>
                                Remove
                            </Button>
                        </div>
                    ))
                }
                <nav className="flex items-center gap-2">
                    <Button type="button" variant="primary" outlined="dashed"
                            onClick={() => setData(prevState => ({
                                ...prevState,
                                documents: [...prevState.documents ?? [], {}],
                            }))}>
                        + Add document
                    </Button>
                    <Button type="button" variant="warning" outlined="dashed"
                            onClick={() => setData(prevState => ({
                                ...prevState,
                                documents: [
                                    { type: "id_card", number: "ID123456" },
                                    { type: "passport", number: "PP123456" }
                                ],
                            }))}>
                        Reload documents
                    </Button>
                    <Button type="button" variant="danger" outlined="dashed"
                            onClick={() => setData(prevState => ({
                                ...prevState,
                                documents: [],
                            }))}>
                        Clear documents
                    </Button>
                </nav>
            </section>
            <Button type="button" outlined="solid" onClick={() => setData({})}>
                Reset
            </Button>
            <section className="my-2">
                <p>State:</p>
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </section>
        </ExampleBlock>
    );
}
