import { createBrowserRouter } from "react-router-dom";
import { App } from "./app";
import { Home } from "./screens/Home";
import { Onboard } from "./screens/Onboard";
import { Capture } from "./screens/AddCapture";
import { AddReview } from "./screens/AddReview";
import { AddSpeak } from "./screens/AddSpeak";
import { AddConfirm } from "./screens/AddConfirm";
import { AddPrice } from "./screens/AddPrice";
import { AddChannels } from "./screens/AddChannels";
import { AddDone } from "./screens/AddDone";
import { MyShop } from "./screens/MyShop";
import { ProductDetail } from "./screens/ProductDetail";
import { Orders } from "./screens/Orders";
import { OrderDetail } from "./screens/OrderDetail";
import { Insights } from "./screens/Insights";
import { Profile } from "./screens/Profile";
import { Learn } from "./screens/Learn";
import { Offline } from "./screens/Offline";

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "onboard", element: <Onboard /> },
      { path: "add", element: <Capture /> },
      { path: "add/review", element: <AddReview /> },
      { path: "add/speak", element: <AddSpeak /> },
      { path: "add/confirm", element: <AddConfirm /> },
      { path: "add/price", element: <AddPrice /> },
      { path: "add/channels", element: <AddChannels /> },
      { path: "add/done", element: <AddDone /> },
      { path: "products", element: <MyShop /> },
      { path: "products/:id", element: <ProductDetail /> },
      { path: "orders", element: <Orders /> },
      { path: "orders/:id", element: <OrderDetail /> },
      { path: "insights", element: <Insights /> },
      { path: "profile", element: <Profile /> },
      { path: "learn", element: <Learn /> },
      { path: "offline", element: <Offline /> },
    ],
  },
]);
