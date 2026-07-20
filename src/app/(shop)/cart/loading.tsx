import { CartSkeleton } from "./cart-skeleton";

/** Instant shell for /cart while the live cart loads. */
export default function CartLoading() {
  return <CartSkeleton />;
}
