export const calculateTotal = (cart) => {
  return cart.reduce((acc, item) => acc + item.price * item.qty, 0);
};