import { type MessageSeverity, Severity } from "@kerty-ui/react-forms";
import { createClassName } from "../utils.ts";

export type MessageProps = {
    text: string;
    severity?: MessageSeverity
}

export const Message = (props: MessageProps) => {

    const messageStyle = createClassName("mb-3 p-2 border", {
        "text-green-500 border-green-600": props.severity === Severity.Success,
        "text-blue-400 border-blue-500": props.severity === Severity.Info,
        "text-yellow-500 border-yellow-600": props.severity === Severity.Warning,
        "text-red-500 border-red-600": props.severity === Severity.Error,
    });

    return <div className={messageStyle}>{props.text}</div>;
}
