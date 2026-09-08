/** Shared between the cart UI and the server actions it calls. */
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  note: string;
}
