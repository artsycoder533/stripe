import { NextResponse } from "next/server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getActiveProducts = async () => {
  const checkProducts = await stripe.products.list();
  //filter out only active products
  const availableProducts = checkProducts.data.filter(
    (product: any) => product.active === true
  );
  return availableProducts;
};

export const POST = async (request: any) => {
  const { products } = await request.json();
  const data: Product[] = products;

  let activeProducts = await getActiveProducts();

  try {
    for (const product of data) {
      const stripeProduct = activeProducts?.find(
        (stripeProduct: any) =>
          stripeProduct?.name?.toLowerCase() === product?.name?.toLowerCase()
      );

      if (stripeProduct === undefined) {
        const prod = await stripe.products.create({
          name: product.name,
          default_price_data: {
            unit_amount: product.price * 100,
            currency: "usd",
          },
        });
      }
    }
  } catch (error) {
    console.error("error in creating a new product", error);
    throw error;
  }

  activeProducts = await getActiveProducts();
  console.log('active products ==>', activeProducts)
  //construst array of objects that we will pass to the stripe checkout session
  let stripeItems: any = [];

  for (const product of data) {
    const stripeProduct = activeProducts?.find(
        (prod: any) =>
          prod?.name?.toLowerCase() === product?.name?.toLowerCase()
      );

    if (stripeProduct) {
        console.log('stripe product==>', stripeProduct)
      stripeItems.push({
        price: stripeProduct?.default_price,
        quantity: product?.quantity,
      });
    }
  }

  console.log('stripeItems ==>', stripeItems)

  //create stripe session
  const session = await stripe.checkout.sessions.create({
    line_items: stripeItems,
    mode: "payment",
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/cancel",
  });

  return NextResponse.json({ url: session.url });
};
