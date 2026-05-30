export type LoginForm = {
    username: string;
    password: string;
}

export type ProfileForm = {
    username: string;
    password: string;
    confirmPassword: string;
    email: string;
};

export type ComplexForm = {
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


export type GridFormRow = {
    id: number;
    cell1: number | null;
    cell2: number | null;
    cell3: number | null;
    cell4: number | null;
    cell5: number | null;
    cell6: number | null;
    cell7: number | null;
    cell8: number | null;
    cell9: number | null;
    cell10: number | null;
}

export type GridForm = {
    rows: GridFormRow[];
    phone?: string;
}
