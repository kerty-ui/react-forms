# @kerty-ui/react-forms

This is another React forms library - designed to build controlled forms. replacing **useState** and **useReducer** custom implementations.

Kerty forms main responsibility is to handle form data changes.
While `useState` can be fine for small, one-level forms like login page, everything becomes slightly complicated when data model contains arrays and child models.
Kerty forms provides a simple API to handle such cases without the need to write custom logic for nested data updates.
You just specify the field path and value and Kerty forms will take care of the rest.

One key thing to note is that Kerty forms does not handle form submission and async validations.

## ✨ Key Features
- **Flexible** - Works great for small forms (like `useState` replacement) or complex multi-step workflows.
- **Type-Safe** - Full TypeScript support with type inference across the entire API;
- **Lightweight** - No dependencies beyond React; Pretty tiny bundle size;
- **Two Approaches**
    - **Form subscriber**: Use `useFormWatch` for simple forms - one listener, full rerender on any change;
    - **Field subscriber**: Use `useForm` + `useField` to subscribe to specific fields - only re-render when those fields change;
- **Validation Out-of-the-Box** - Declarative validators with rule sets, custom messages, and severity levels;

## 🚀 Quick Start

### Simple Form - just like using `useState`

```tsx
import { useFormWatch } from '@kerty-ui/react-forms';

type LoginModel = {
    username: string;
    password: string;
}

const LoginForm = () => {
  const [form, data] = useFormWatch<LoginModel>();
  return (
    <form>
        <div>
            <label htmlFor="username">Username</label>
            <input
                id="username"
                type="text"
                placeholder="Enter username"
                value={data.username ?? ""}
                onChange={(e) => form.setFieldValue("username", e.target.value)}
            />
        </div>
        <div>
            <label htmlFor="password">Password</label>
            <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={data.password ?? ""}
                onChange={(e) => form.setFieldValue("password", e.target.value)}
            />
        </div>
        <button type="submit">Submit</button>
    </form>
  );
}
```

### Simple message driven validator

Now let's add some validation to our form. We will use `SingleMessageDrivenValidator` to validate our form data and show messages to the user.

```tsx
import { useFormWatch, SingleMessageDrivenValidator, ValidationResult, Severity } from "@kerty-ui/react-forms";

type LoginModel = {
    username: string;
    password: string;
}

const LoginForm = () => {
    const [form, data, state, formValidationResult] = useFormWatch<Partial<LoginForm>>({
        validator: () => new SingleMessageDrivenValidator((result, { data }) => {
            if(!data.username) {
                result.setFieldMessage("username", "Username is required");
            }
            if(!data.password) {
                result.setFieldMessage("password", "Password is required");
            }
        }),
    });
    const usernameMessage = form.getFieldValidationMessage("username");
    const passwordMessage = form.getFieldValidationMessage("password");
    return (
        <form onSubmit={e => {
            e.stopPropagation();
            e.preventDefault();
            if(form.validate().isValid) {                
                // You would call your API here, handle response and apply validations results if needed.
                // For demo purposes we will just check if username and password are correct and show a message.
                if(data.username === "Chuck" && data.password === "Norris") {
                    form.applyValidationResult(new ValidationResult().set({
                        text: "Welcome, Chuck Norris!",
                        severity: Severity.Success,
                    }));
                }
                else {
                    form.applyValidationResult(new ValidationResult().set({
                        text: "Username or password is incorrect",
                        severity: Severity.Error,
                    }));
                }
            }
        }}>
            {formValidationResult?.messages.map((message, i) => <p key={i}>{message.text}</p>)}
            <div>
                <label htmlFor="username">Username</label>
                <input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={data.username ?? ""}
                    onChange={(e) => form.setFieldValue("username", e.target.value)}
                />
                {usernameMessage && <p>{usernameMessage.text}</p>}
            </div>
            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={data.password ?? ""}
                    onChange={(e) => form.setFieldValue("password", e.target.value)}
                />
                {passwordMessage && <p>{passwordMessage.text}</p>}
            </div>
            <button type="submit">Submit</button>
        </form>
    );
}
```
