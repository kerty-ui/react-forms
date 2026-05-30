import { type ValidationMessage } from "@kerty-ui/react-forms";

type FieldMessageProps = {
    message?: ValidationMessage;
};

export const FieldMessage = ({ message }: FieldMessageProps) => {
    return message ? <p data-severity={message.severity}>{message.text}</p> : null;
};
