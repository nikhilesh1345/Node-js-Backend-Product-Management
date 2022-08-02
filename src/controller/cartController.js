const cartModel = require("../model/cartModel");
const mongoose = require("mongoose");
const userModel = require("../model/userModel");
const productModel = require("../model/productModel");
const { isValid } = require("../validations/validations");

exports.createCart = async (req, res) => {
  try {
    let { userId } = req.params;
    let { cartId, productId } = req.body;

    if (!mongoose.isValidObjectId(userId))
      return res.status(400).send({ status: false, message: "invalid userId" });
    let user = await userModel.findOne({ _id: userId });
    if (!user)
      return res
        .status(404)
        .send({ status: false, message: "no such user found" });

    if (!mongoose.isValidObjectId(productId))
      return res
        .status(400)
        .send({ status: false, message: "invalid productId" });
    let findProduct = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!findProduct)
      return res.status(404).send({
        status: false,
        message: "no such product found or maybe deleted",
      });

    let productPrice = findProduct.price;

    let productDetails = {
      productId,
      quantity: 1,
    };

    let findCart;

    if ("cartId" in req.body) {
      if (!mongoose.isValidObjectId(cartId))
        return res
          .status(400)
          .send({ status: false, message: "invalid cartId" });
      findCart = await cartModel.findOne({ _id: cartId });

      return res
        .status(404)
        .send({ status: false, message: "cart id does not exists" });
    } else {
      findCart = await cartModel.findOne({ userId: userId });
    }

    if (findCart) {
      let alreadyProductsId = findCart.items.map((x) => x.productId.toString());
      if (alreadyProductsId.includes(productId)) {
        let updatedCart = await cartModel.findOneAndUpdate(
          { "items.productId": productId, userId: userId },
          { $inc: { "items.$.quantity": 1, totalPrice: productPrice } },
          { new: true }
        );
        //positional operator($) is used to increase in array

        return res
          .status(201)
          .send({ status: true, message: "Success", data: updatedCart });
      } else {
        let updatedCart = await cartModel.findOneAndUpdate(
          { userId: userId },
          {
            $push: { items: productDetails },
            $inc: { totalItems: 1, totalPrice: productPrice },
          },
          { new: true }
        );

        return res
          .status(201)
          .send({ status: true, message: "Success", data: updatedCart });
      }
    }

    const cartCreate = {
      userId,
      items: [productDetails],
      totalItems: 1,
      totalPrice: productPrice,
    };
    const cartCreated = await cartModel.create(cartCreate);
    res.status(201).send({
      status: true,
      message: "cart created successfully",
      data: cartCreated,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ status: false, message: err.message });
  }
};

// **********************Update Api********************
exports.updateCart = async (req, res) => {
  try {
    let data = req.body;
    let userId = req.params.userId;

    if (Object.keys(data).length == 0) {
      return res
        .status(400)
        .send({ status: false, msg: "Product details must need to update" });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).send({ status: false, msg: "need userId" });
    }
    const isPresentUser = await userModel.findById({ _id: userId });

    if (!isPresentUser) {
      return res.status(404).send({ status: false, msg: "User not found" });
    }

    const { cartId, productId, removeProduct } = data;

    if (!isValid(cartId)) {
      return res.status(400).send({ status: false, msg: "CardId is required" });
    }

    if (!isValid(productId)) {
      return res
        .status(400)
        .send({ status: false, msg: "Product Id is requried" });
    }

    if (!isValid(removeProduct)) {
      return res
        .status(400)
        .send({ status: false, msg: "Remove product is requried" });
    }

    //  if(removeProduct )

    if (!mongoose.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, msg: "Product Id is invalid" });
    }
    const isPresentProductId = await productModel.findById(productId);
    if (!isPresentProductId) {
      return res
        .status(404)
        .send({ status: false, msg: "Product Id does not exist" });
    }

    if (!mongoose.isValidObjectId(cartId)) {
      return res.status(400).send({ status: false, msg: "Cart Id is invalid" });
    }
    if (!(removeProduct == 0 || removeProduct == 1)) {
      return res
        .status(400)
        .send({
          status: false,
          msg: "removeProduct value should be either 0 or 1",
        });
    }

    const isPresentCartId = await cartModel.findOne({
      _id: cartId,
      userId: userId,
    });
    if (!isPresentCartId) {
      return res.status(404).send({ status: false, msg: "No such cart exist" });
    }

    if (!(removeProduct == 0 || removeProduct == 1)) {
      return res
        .status(400)
        .send({
          status: false,
          msg: "removeProduct value should be either 0 or 1",
        });
    }

    const productDetails = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!productDetails) {
      return res
        .status(404)
        .send({ status: false, msg: "product not exist or deleted" });
    }

    const cart = isPresentCartId.items;

    for (let i = 0; i < cart.length; i++) {
      if (cart[i].productId == productId) {
        let changePrice = cart[i].quantity * isPresentProductId.price;

        if (removeProduct == 0) {
          const productRemove = await cartModel.findOneAndUpdate(
            { _id: cartId },
            {
              $pull: { items: { productId: productId } },
              totalPrice: isPresentCartId.totalPrice - changePrice,
              totalItems: isPresentCartId.totalItems - 1,
            },
            { new: true }
          );
          return res
            .status(200)
            .send({
              status: true,
              msg: "Remove product Successfully",
              data: productRemove,
            })
            .select({ __v: 0 });
        }

        if (removeProduct == 1) {
          if (cart[i].quantity == 1 && removeProduct == 1) {
            const priceUpdate = await cartModel.findOneAndUpdate(
              { _id: cartId },
              {
                $pull: { items: { productId } },
                totalPrice: isPresentCartId.totalPrice - changePrice,
                totalItems: isPresentCartId.totalItems - 1,
              },
              { new: true }
            );
            return res
              .status(200)
              .send({
                status: true,
                msg: "Remove product and price update successfully",
                data: priceUpdate,
              })
              .select({ __v: 0 });
          }
          cart[i].quantity = cart[i].quantity - 1;
          const cartUpdated = await cartModel.findByIdAndUpdate(
            { _id: cartId },
            {
              items: cart,
              totalPrice: isPresentCartId.totalPrice - isPresentProductId.price,
            },
            { new: true }
          );
          return res
            .status(200)
            .send({
              status: true,
              msg: "One item remove successfully",
              data: cartUpdated,
            });
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ status: false, message: err.message });
  }
};

// ***************** Get Api********************
exports.getCart = async (req, res) => {
  try {
    let userId = req.params.userId;
    // if userId is not a valid ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: "userId is invalid" });
    }

    // if user does not exist
    let userDoc = await userModel.findById(userId);
    if (!userDoc) {
      return res
        .status(400)
        .send({ status: false, message: "user does not exist" });
    }
 
    //checking if the cart exist with this userId or not
    let findCart = await cartModel.findOne({ userId: userId }).populate(
      "items.productId"
    );
     
    if (!findCart)
      return res
        .status(404)
        .send({
          status: false,
          message: `No cart found with this "${userId}" userId`,
        });

    res.status(200).send({ status: true, message: "Success", data: findCart });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

// *******************Delete Api*********************
exports.deleteCart = async function (req, res) {
  try {
    let userId = req.params.userId;
    if (req.params.userId) {
      if (!userId)
        return res
          .status(404)
          .send({ status: false, msg: "Please provide valid userId" });
    }

    let checkCart = await cartModel.findOne({userId});
    if (!checkCart)
      return res.status(404).send({ status: false, msg: "No Cart Found" });
    let deleteData = await cartModel.findOneAndUpdate({ _id: checkCart._id }, { items: [], totalPrice: 0, totalItems: 0 }, { new: true })

    res.status(204).send({
      status: true,
      msg: "Product has been deleted successfully",
      data: deleteData,
    });
  } catch (error) {
    return res.status(500).send({ status: false, msg: error.message });
  }
};
