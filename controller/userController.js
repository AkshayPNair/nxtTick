const userSchema=require("../model/userModel");
const productSchema=require("../model/productSchema");
const mongoose = require('mongoose');
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = require("../routes/user");
const categorySchema = require("../model/categorySchema");
const cart=require("../model/cartSchema");
const addressSchema=require("../model/addressSchema");
const orderSchema=require("../model/orderSchema");
const razorpayService = require('../utils/razorpay');
const saltrounds=10;
const couponSchema=require("../model/couponSchema");
const walletSchema=require("../model/walletSchema");
const offerSchema=require("../model/offerSchema");
require('dotenv').config();
let otpStore = {};  // To temporarily store OTPs 


module.exports={
    //register user
    registerUser:async (req,res)=>{
        try {
           const{name,email,password}=req.body
           console.log(`Name: ${name} , Email: ${email} , Password: ${password}`)

           // Check if user exists
           const existingUser = await userSchema.findOne({ email: email });
           if (existingUser) {
               return res.status(400).json({status:false,message:"User already exists"})
           }

           // Generate OTP and store it temporarily
           const otp = crypto.randomInt(1000, 10000); // 4-digit OTP
           otpStore[email] = { otp: otp, time: Date.now(), name, email, password };

           // Send OTP via email
           sendOtpEmail(email, otp);

           // Render OTP verification page
           return res.status(200).json({status:true,message:"OTP sent successfully",email:email})
           
       } catch (error) {
           console.error("Error during registration:", error);
           res.status(500).json({status:false ,message:"An error occurred during registration"});
       }
   },
    //load signup
    loadSignup:(req,res)=>{
        try {
          res.render("user/signup")  
        } catch (error) {
            res.status(500).send("page not found")
        }
    },
    //load login
    loadLogin:(req,res)=>{
        try {
            res.render("user/login")
        } catch (error) {
            res.status(500).send("error occured")
        }
    },
    // login user
    loginUser:async (req,res)=>{
        try {
            const { email, password } = req.body
            console.log(`Email: ${email}, Password: ${password}`);

            const user= await userSchema.findOne({email:email})
            
            if(!user){
                return res.status(400).json({status:false,message:"User doesn't exist"})
            }
            const match= await bcrypt.compare(password,user.password)
            if(!match){
                return res.status(400).json({status:false,message:"Password doesn't match"})
            }
            if(user.isBlock){
                return res.status(400).json({status:false,isBlock:true,messsage:"User is Blocked by admin"})
            }
            req.session.user=user;
            return res.status(200).json({status:true, isBlock:false,message:"Login Successfully"})
            
        } catch (error) {
             res.status(500).json({status:false,message:"Error Occured"})
        }
    }, 
    
    //loadotp page
    loadOtp:(req,res)=>{
        try {
            const {email} = req.query; 
            res.render('user/verifyOtp',{email}) //load otp page
            
        } catch (error) {
            console.log("otp page not found")
            res.status(500).json({status: false,message: "Error loading OTP verification page"});
            
        }
    },

    // Verify OTP
    verifyOtp: async (req, res) => {
      try{  
        const { email, otp } = req.body;

        console.log("verify otp :" +otp)
        if (!otpStore[email]) {
            return res.status(400).json({ status: false, message: "No OTP request found for this email" });
        }


        if (otpStore[email] && otpStore[email].otp == otp) {
            const timeElapsed = Date.now() - otpStore[email].time;
            if (timeElapsed < 1 * 60 * 1000) { // otp valid for 1 minutes
                //create user in database
                const { name, password } = otpStore[email];
                const hashedPassword = await bcrypt.hash(password, saltrounds);
                const newUser = new userSchema({ name, email, password: hashedPassword, status: true });
                await newUser.save();

                // clear otp store
                delete otpStore[email];
                // redirect to home
                return res.status(200).json({ status: true, message: "OTP verified successfully, user created!" });
            } else {
                return res.status(400).json({ status: false, message: "OTP expired. Please request a new one." });
            }
        } else {
            res.status(400).json({ status: false, message: "Invalid OTP" });
        }
     } catch(error){
            console.error("Error during OTP verification:", error);
            res.status(500).json({status:false,message: "An error occurred during OTP verification"});
     }
    },

    // Resend OTP
    resendOtp: (req, res) => {
      try{  
        const { email } = req.body;
        const currentTime = Date.now();
        const resendCooldown = 60 * 1000;  

        if (otpStore[email]) {
            const timeElapsed = currentTime - otpStore[email].time;
            if (timeElapsed < resendCooldown) {
                const remainingTime = Math.ceil((resendCooldown - timeElapsed) / 1000);
                res.status(400).json({ status: false, message: `Please wait ${remainingTime} seconds before resending OTP.` });  
            }
        }

        
        const otp = crypto.randomInt(1000, 10000);
        otpStore[email] = { ...otpStore[email],otp: otp, time: currentTime };
        
        sendOtpEmail(email, otp);

        res.status(200).json({ status: true, message: "OTP resent successfully." });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({
            status: false,
            message: "Error resending OTP"
        });
     }
   },

    loadHome: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = userId ? await userSchema.findById(userId) : null;
            
            // Fetch products with offers populated
            const products = await productSchema.find({ isDeleted: false })
                .populate('offer')
                .populate({ 
                    path: 'category', 
                    populate: { path: 'offer' },
                    match: { isBlock: false } 
                })
                .sort({purchaseCount:-1})
                .limit(4)
                .exec();
                
            const popularProducts = await productSchema.find({ isDeleted: false })
                .populate('offer')
                .populate({ 
                    path: 'category', 
                    populate: { path: 'offer' },
                    match: { isBlock: false } 
                })
                .sort({purchaseCount:-1})
                .skip(6)
                .limit(4)
                .exec();

            const filterProduct = products.filter(product => product.category !== null);
            const filterPopularProduct = popularProducts.filter(product => product.category !== null);

            // Map new products with rounded prices and offer information
            const Obj = filterProduct.map((data) => {
                let basePrice = Math.round(Number(data.price));
                let finalPrice = basePrice;
                let activeOffer = null;

                if (data.offer && data.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: data.offer.discountValue
                    };
                } else if (data.category.offer && data.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: data.category.offer.discountValue
                    };
                }

                return {
                    _id: data._id,
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: data.images,
                    isInWishlist: user ? user.wishlist.includes(data._id) : false
                };
            });

            // Map popular products with rounded prices and offer information
            const Obj2 = filterPopularProduct.map((data) => {
                let basePrice = Math.round(Number(data.price));
                let finalPrice = basePrice;
                let activeOffer = null;

                if (data.offer && data.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: data.offer.discountValue
                    };
                } else if (data.category.offer && data.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: data.category.offer.discountValue
                    };
                }

                return {
                    _id: data._id,
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: data.images,
                    isInWishlist: user ? user.wishlist.includes(data._id) : false
                };
            });

            res.render("user/home", {
                data: Obj,
                data2: Obj2,
                user: user
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occurred");
        }
    },
    loadproductView: async (req, res) => {
        try {
            // Fetch product with offers populated
            const findProduct = await productSchema.findOne({ _id: req.params.productId})
                .populate('offer')
                .populate({
                    path: 'category',
                    populate: {
                        path: 'offer'
                    }
                });

            
            if (!findProduct || findProduct.isDeleted) {
                return res.redirect('/'); 
            }

            const userId = req.session.user;
            const user = userId ? await userSchema.findById(userId) : null;

            // Check if product is in user's wishlist
            const isInWishlist =  user ? user.wishlist.includes(findProduct._id) : false;
            findProduct.isInWishlist = isInWishlist;

            // Ensure price is a number
            findProduct.price = Number(findProduct.price);
            
            // Calculate final price based on offers
            let finalPrice = findProduct.price;
            let activeOffer = null;

            // Check for product-specific offer first
            if (findProduct.offer && findProduct.offer.isActive) {
                finalPrice = findProduct.price - (findProduct.price * findProduct.offer.discountValue / 100);
                activeOffer = {
                    type: 'Product Offer',
                    discountValue: findProduct.offer.discountValue
                };
            } 
            // If no product offer, check for category offer
            else if (findProduct.category && findProduct.category.offer && findProduct.category.offer.isActive) {
                finalPrice = findProduct.price - (findProduct.price * findProduct.category.offer.discountValue / 100);
                activeOffer = {
                    type: 'Category Offer',
                    discountValue: findProduct.category.offer.discountValue
                };
            }

            // Add calculated values to product object
            findProduct.finalPrice = Math.round(finalPrice);
            findProduct.activeOffer = activeOffer;

            // Fetch similar products with their offers
            const products = await productSchema.find({ isDeleted: false })
                .populate('offer')
                .populate({ 
                    path: 'category', 
                    populate: { path: 'offer' },
                    match: { isBlock: false } 
                })
                .sort({ createdAt: -1 })
                .limit(4)
                .exec();

            const filterProduct = products.filter(product => product.category !== null);

            // Process similar products
            const Obj = filterProduct.map((product) => {
                let similarProductFinalPrice = product.price;
                let similarProductOffer = null;

                if (product.offer && product.offer.isActive) {
                    similarProductFinalPrice = product.price - (product.price * product.offer.discountValue / 100);
                    similarProductOffer = {
                        type: 'Product Offer',
                        discountValue: product.offer.discountValue
                    };
                } else if (product.category.offer && product.category.offer.isActive) {
                    similarProductFinalPrice = product.price - (product.price * product.category.offer.discountValue / 100);
                    similarProductOffer = {
                        type: 'Category Offer',
                        discountValue: product.category.offer.discountValue
                    };
                }

                return {
                    _id: product._id,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    brand: product.brand,
                    price: Number(product.price),
                    finalPrice: Math.round(similarProductFinalPrice),
                    activeOffer: similarProductOffer,
                    images: product.images,
                    isInWishlist: user ? user.wishlist.includes(product._id) :false
                };
            });

            res.render("user/productView", {
                data: findProduct,
                find: Obj,
                user
            });

        } catch (error) {
            console.error("Error in loadproductView:", error);
            res.status(500).send("Error Occurred");
        }
    },
    //loadShopPage
    
     loadCart: async (req, res) => {
        try {
            const userId = req.session.user;
            
            // Check if user is logged in
            if (!userId) {
                return res.redirect('/user/login'); 
            }

            const user = await userSchema.findById(userId);
            
            // Fetch cart items with populated product and offer information
            const cartItems = await cart.find({ userId })
                .populate({
                    path: 'productId',
                    populate: [
                        { path: 'offer' },
                        { 
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                })
                .exec();

            // Filter out deleted products and redirect if any found
            const hasDeletedProducts = cartItems.some(item => !item.productId || item.productId.isDeleted);
            if (hasDeletedProducts) {
                // Remove deleted products from cart
                await cart.deleteMany({ 
                    userId,
                    productId: { 
                        $in: cartItems
                            .filter(item => !item.productId || item.productId.isDeleted)
                            .map(item => item.productId?._id)
                    }
                });
                return res.redirect('/user/cart');
            }

            // Process cart items to include discount information
            const cartDetails = cartItems.map(item => {
                const product = item.productId;
                let basePrice = Number(product.price);
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product-specific offer
                if (product.offer && product.offer.isActive) {
                    finalPrice = basePrice - (basePrice * product.offer.discountValue / 100);
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: product.offer.discountValue
                    };
                }
                // Check for category offer if no product offer
                else if (product.category && product.category.offer && product.category.offer.isActive) {
                    finalPrice = basePrice - (basePrice * product.category.offer.discountValue / 100);
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: product.category.offer.discountValue
                    };
                }

                return {
                    product: {
                        ...product.toObject(),
                        finalPrice: Math.round(finalPrice),
                        activeOffer: activeOffer
                    },
                    quantity: item.quantity,
                    subtotal: Math.round(finalPrice * item.quantity)
                };
            });

            // Calculate total
            const total = cartDetails.reduce((acc, item) => acc + item.subtotal, 0);

            res.render("user/cart", { 
                cartItems: cartDetails, 
                total,
                user,
                helpers: {
                    roundPrice: (price) => Math.round(price),
                    multiply: (price, quantity) => Math.round(price * quantity)
                }
            });
        } catch (error) {
            console.error("Error fetching cart:", error);
            res.status(500).send("Error loading cart");
        }
    },
    addToCart: async (req, res) => {
        try {
            const { productId, quantity } = req.body;
            const userId = req.session.user; 

            if (!userId){
                res.redirect('/user/login')
            }
    
            // Check if product exists and is not deleted
            const product = await productSchema.findOne({_id: productId,isDeleted: false});

            if (!product) {
                return res.status(404).json({ status: false, message: "Product not available" });
            }

            const requestedQuantity = parseInt(quantity);
            if (requestedQuantity <= 0) {
                return res.status(400).json({ status: false, message: "Invalid quantity" });
            }
    
            if (product.stock === 0) {
                return res.status(400).json({ status: false, message: "Product is out of stock" });
            }
    
            const existingCartItem = await cart.findOne({ userId, productId });
    
            if (existingCartItem) {
                const totalQuantity = existingCartItem.quantity + requestedQuantity;
    
                if (totalQuantity > 4) {
                    return res.status(400).json({
                        status: false,
                        message: "You cannot add more than 4 units Limit Exceeded",
                    });
                }
    
                if (totalQuantity > product.stock) {
                    return res.status(400).json({
                        status: false,
                        message: `Insufficient stock, Only ${product.stock} left`,
                    });
                }
    
                existingCartItem.quantity = totalQuantity;
                await existingCartItem.save();
                return res.status(200).json({ status: true, message: "Product quantity updated in cart" });
            } else {
                if (requestedQuantity > 4) {
                    return res.status(400).json({
                        status: false,
                        message: "You cannot add more than 4 units Limit Exceeded",
                    });
                }
    
                if (requestedQuantity > product.stock) {
                    return res.status(400).json({
                        status: false,
                        message: `Insufficient stock, Only ${product.stock} left`,
                    });
                }
    
                const newCartItem = new cart({
                    userId,
                    productId,
                    quantity: requestedQuantity,
                });
                await newCartItem.save();
                return res.status(200).json({ status: true, message: " Added to cart successfully!" });
            }
        } catch (error) {
            console.error("Error adding product to cart:", error);
            res.status(500).json({ status: false, message: "Error adding to cart" });
        }
    },
    
    
    updateCartQuantity: async (req, res) => {
        const { productId, quantity } = req.body;
        try {
            const userId = req.session.user;
            const updatedQuantity = parseInt(quantity);

            // Validate quantity
            if (updatedQuantity <= 0) {
                return res.status(400).json({ message: 'Quantity must be greater than 0' });
            }

            // Check product stock
            const product = await productSchema.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            if (updatedQuantity > product.stock) {
                return res.status(400).json({ message: `Only ${product.stock} items available in stock` });
            }

            if (updatedQuantity > 4) {
                return res.status(400).json({ message: 'Maximum quantity limit is 4' });
            }

            // Update cart quantity
            const result = await cart.findOneAndUpdate(
                { userId, productId },
                { quantity: updatedQuantity },
                { new: true }
            );

            if (!result) {
                return res.status(404).json({ message: 'Cart item not found' });
            }

            res.status(200).json({ 
                message: 'Quantity updated successfully',
                newQuantity: updatedQuantity
            });
        } catch (error) {
            console.error('Error updating cart quantity:', error);
            res.status(500).json({ message: 'Failed to update quantity' });
        }
    },
    validateCart: async (req, res) => {
        try {
            const userId = req.session.user;
            
            // Fetch cart items with product details
            const cartItems = await cart.find({ userId })
                .populate('productId');

            // Check if cart is empty
            if (!cartItems || cartItems.length === 0) {
                return res.status(400).json({
                    status: false,
                    message: "Your cart is empty. Please add items to proceed to checkout."
                });
            }

            // Check for deleted or unavailable products
            const deletedProducts = cartItems.filter(item => 
                !item.productId || item.productId.isDeleted
            );

            if (deletedProducts.length > 0) {
                // Remove deleted products from cart
                await cart.deleteMany({ 
                    userId,
                    productId: { 
                        $in: deletedProducts.map(item => item.productId?._id)
                    }
                });

                return res.status(400).json({
                    status: false,
                    message: "Some products in your cart are no longer available."
                });
            }

            res.status(200).json({ status: true });
        } catch (error) {
            console.error("Error validating cart:", error);
            res.status(500).json({
                status: false,
                message: "Error validating cart"
            });
        }
    },
    removeFromCart: async (req, res) => {
        try {
            const { productId } = req.body;
            const userId = req.session.user;

            
            await cart.deleteOne({ userId, productId });

            res.redirect('/user/cart');
        } catch (error) {
            console.error("Error removing product from cart:", error);
            res.status(500).json({ status: false, message: "Error removing product from cart" });
        }
    },

    loadProfile: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = await userSchema.findById(userId);
            
            if (!user) {
                return res.status(404).send("User not found");
            }

            // Create a safe user object with default values for undefined properties
            const userData = {
                name: user.name || '',
                email: user.email || '',
                gender: user.gender || '',
                profileImage: user.profileImage || '',
                googleId: user.googleId || '',
                createdAt: user.createdAt ? user.createdAt.toString() : '',
                _id: user._id ? user._id.toString() : ''
            };

            res.render('user/profile', { user: userData });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred");
        }
    },
    updateProfile: async(req,res)=>{
        try {
            const userId = req.session.user;
            const { name, gender, croppedImage } = req.body;

            // Create update object
            const updateData = {
                name: name.trim(),
                gender: gender.trim(),
            };

            
            if (croppedImage) {
                updateData.profileImage = croppedImage;
            }

            
            await userSchema.findByIdAndUpdate(userId, updateData, { new: true });

            res.redirect('/user/profile'); 
        } catch (error) {
            console.error("Error updating profile:", error);
            res.status(500).json({ status: false, message: "Error updating profile" });
        }
    },
    loadAddress:async(req,res)=>{
        try {
            const userId=req.session.user;
            const user=await userSchema.findById(userId)
            const addresses=await addressSchema.find({userId}).sort({createdAt:-1})
            res.render("user/address",{addresses,user});
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: 'Failed to retrieve addresses', error: error.message });

        }
    },
    loadCheckout: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = await userSchema.findById(userId);
            
            // Fetch cart items with populated product and offer information
            const cartItems = await cart.find({ userId })
                .populate({
                    path: 'productId',
                    populate: [
                        { path: 'offer' },
                        { 
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                })
                .exec();

            

            // Process cart items to include discount information
            const cartDetails = cartItems.map(item => {
                const product = item.productId;
                let basePrice = Number(product.price);
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product-specific offer
                if (product.offer && product.offer.isActive) {
                    finalPrice = basePrice - (basePrice * product.offer.discountValue / 100);
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: product.offer.discountValue
                    };
                }
                // Check for category offer if no product offer
                else if (product.category && product.category.offer && product.category.offer.isActive) {
                    finalPrice = basePrice - (basePrice * product.category.offer.discountValue / 100);
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: product.category.offer.discountValue
                    };
                }

                return {
                    product: {
                        ...product.toObject(),
                        finalPrice: Math.round(finalPrice),
                        activeOffer: activeOffer
                    },
                    quantity: item.quantity,
                    subtotal: Math.round(finalPrice * item.quantity)
                };
            });

            // Calculate totals
            const subtotal = cartDetails.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
            const finalTotal = cartDetails.reduce((acc, item) => acc + item.subtotal, 0);
            
            // Fetch addresses and coupons
            const addresses = await addressSchema.find({ userId });
            const coupons = await couponSchema.find({ isActive: true });
            const wallet = await walletSchema.findOne({ userId });

            const hasActiveOffers = cartItems.some(item => 
                (item.productId.offer && item.productId.offer.isActive) || 
                (item.productId.category?.offer && item.productId.category.offer.isActive)
            );

            res.render('user/checkout', {
                user,
                cartItems: cartDetails,
                address: addresses,
                coupons,
                total: subtotal,
                finalTotal,
                wallet: wallet || { balance: 0 },
                hasActiveOffers,
                helpers: {
                    roundPrice: (price) => Math.round(price)
                }
            });

        } catch (error) {
            console.error('Error in loadCheckout:', error);
            res.status(500).send('Error loading checkout page');
        }
    },
    placeOrder: async (req, res) => {
        try {
            const userId = req.session.user;
            if (!userId) {
                return res.redirect('/user/login');
            }

            const cartItems = await cart.find({ userId }).populate("productId").exec();

            // Check for deleted products
            const deletedProducts = cartItems.filter(item => 
                !item.productId || item.productId.isDeleted
            );

            if (deletedProducts.length > 0) {
                const deletedProductNames = deletedProducts
                    .map(item => item.productId?.name || 'Unknown product')
                    .join(', ');

                return res.status(400).json({ 
                    status: false,
                    message: `Products are no longer available: ${deletedProductNames}.`
                });
            }

            const { addressId, paymentMethod, finalAmount, couponCode } = req.body;
            
            // Check if payment method is wallet
            if (paymentMethod === 'Wallet') {
                const wallet = await walletSchema.findOne({ userId });
                
                if (!wallet || wallet.balance < finalAmount) {
                    return res.status(400).json({ 
                        message: "Insufficient wallet balance",
                        currentBalance: wallet ? wallet.balance : 0
                    });
                }
            }

            if (!cartItems.length) {
                return res.status(400).json({ message: "Your cart is empty. Add products before placing an order." });
            }

            const address = await addressSchema.findById(addressId);
            if (!address) {
                return res.status(400).json({ message: "Invalid address selected." });
            }

            // Calculate items with proper subtotals
            const orderItems = cartItems.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                subtotal: item.productId.price * item.quantity
            }));

            const orderTotal = orderItems.reduce((acc, item) => acc + item.subtotal, 0);
            let finalTotal = finalAmount || orderTotal;

            // Create base order data
            let orderData = {
                userId,
                address,
                items: orderItems,
                total: finalTotal,
                paymentMethod,
                status: paymentMethod === 'Razorpay' ? 'Pending' : 'Placed',
                paymentStatus: paymentMethod === 'Razorpay' ? 'Pending' : 'Completed',
                createdAt: new Date()
            };

            // Add coupon if used
            if (couponCode) {
                const coupon = await couponSchema.findOne({ couponCode });
                if (coupon) {
                    orderData.couponUsed = {
                        code: couponCode,
                        discount: coupon.discountValue
                    };
                }
            }

            // Check stock availability
            for (const item of cartItems) {
                const product = await productSchema.findById(item.productId._id);
                if (product.stock < item.quantity) {
                    return res.status(400).json({ 
                        message: `Not enough stock. Only ${product.stock} left.` 
                    });
                }
            }

            for (const item of cartItems) {
                await productSchema.findByIdAndUpdate(
                    item.productId._id,
                    { 
                        $inc: { 
                            stock: -item.quantity,
                            purchaseCount: 1
                        } 
                    }
                );
            }

            // Handle different payment methods
            if (paymentMethod === 'Wallet') {
                const wallet = await walletSchema.findOne({ userId });
                
                // Deduct amount from wallet
                wallet.balance -= finalTotal;
                wallet.transactions.push({
                    type: 'debit',
                    amount: finalTotal,
                    description: 'Order payment',
                    date: new Date()
                });
                await wallet.save();

                orderData.status="Pending";
                orderData.paymentStatus="Completed";

                // Create and save order
                const newOrder = new orderSchema(orderData);
                await newOrder.save();

                // Update product stock and category purchase counts
                for (const item of cartItems) {
                    try {
                        // Update product stock and purchase count
                        await productSchema.findByIdAndUpdate(
                            item.productId._id,
                            { 
                                $inc: { stock: -item.quantity,purchaseCount: 1 } 
                            }
                        );

                        // Get the product with category information
                        const product = await productSchema.findById(item.productId._id);
                        
                        // Update category purchase count if category exists
                        if (product && product.category) {
                            await categorySchema.findByIdAndUpdate(
                                product.category,
                                { $inc: { purchaseCount: 1 } }
                            );
                        }
                    } catch (updateError) {
                        console.error('Error updating counts:', updateError);
                    }
                }
                
                await cart.deleteMany({ userId });
                return res.status(200).json({ message: "Order placed successfully using wallet balance!" });
            } 
            // Handle Razorpay payment
            else if (paymentMethod === 'Razorpay') {
                const options = {
                    amount: finalTotal * 100,
                    currency: "INR",
                    receipt: `order_${Date.now()}`
                };

                try {
                    const razorpayOrder = await razorpayService.orders.create(options);
                    
                    // Add Razorpay order ID to order data
                    orderData.razorpayOrderId = razorpayOrder.id;

                    // Create order in pending state
                    const newOrder = new orderSchema(orderData);
                    await newOrder.save();

                    return res.status(200).json({
                        message: "Razorpay Order Created",
                        razorpayOrderId: razorpayOrder.id,
                        amount: finalTotal * 100,
                        key_id: process.env.RAZORPAY_KEY_ID,
                        orderId: newOrder._id // Send MongoDB order ID
                    });
                } catch (error) {
                    console.error("Razorpay order creation failed:", error);
                    return res.status(500).json({ message: "Failed to create payment order" });
                }
            }
            // Handle COD
            else if (paymentMethod === 'COD') {
                const newOrder = new orderSchema(orderData);
                await newOrder.save();

                // Update product stock and clear cart
                for (const item of cartItems) {
                    await productSchema.findByIdAndUpdate(
                        item.productId._id,
                        { $inc: { stock: -item.quantity, purchaseCount: 1 } }
                    );
                    await categorySchema.findByIdAndUpdate(
                        product.category,
                        { $inc: { purchaseCount: 1 } }
                    )
                }
                await cart.deleteMany({ userId });

                return res.status(200).json({ message: "Order Placed Successfully!" });
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error placing order." });
        }
    },
    verifyPayment: async (req, res) => {
        try {
            const { 
                razorpay_payment_id, 
                razorpay_order_id, 
                razorpay_signature,
                orderId 
            } = req.body;

            // find the order and properly populate product details
            const order = await orderSchema.findById(orderId)
                .populate({
                    path: 'items.product',
                    model: 'product',
                    select: '_id category stock'
                });

            if (!order) {
                return res.status(404).json({ 
                    status: false, 
                    message: "Order not found" 
                });
            }

            // Verify payment signature
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            if (razorpay_signature === expectedSign) {
                // update order status
                order.status = 'Pending';
                order.paymentStatus = 'Completed';
                order.razorpayPaymentId = razorpay_payment_id;
                await order.save();

                // clear cart
                await cart.deleteMany({ userId: order.userId });

                return res.status(200).json({
                    status: true, 
                    message: "Payment verified successfully"
                });
            } else {
                order.paymentStatus = 'Failed';
                await order.save();
                return res.status(400).json({
                    status: false, 
                    message: "Payment verification failed"
                });
            }
        } catch (error) {
            console.error("Payment verification error:", error);
            
            // Update order status to failed in case of any error
            try {
                const order = await orderSchema.findById(req.body.orderId);
                if (order) {
                    order.paymentStatus = 'Failed';
                    await order.save();
                }
            } catch (err) {
                console.error("Error updating order status:", err);
            }

            res.status(500).json({
                status: false, 
                message: "Payment verification failed",
                error: error.message
            });
        }
    },
    cancelOrder: async (req,res)=>{
        try {
            const orderId = req.params.id;
            const order = await orderSchema.findById(orderId)
                .populate({
                    path: 'items.product',
                    populate: [
                        { path: 'offer' },
                        {
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                });

            if(!order) {
                return res.status(404).send("Order not found");
            }

            // Return products to stock
            for (const item of order.items) {
                await productSchema.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { stock: item.quantity } }
                );
            }

            // Only process refund if payment method is not COD
            if (order.paymentMethod !== 'COD') {
                let wallet = await walletSchema.findOne({ userId: order.userId });
                if (!wallet) {
                    wallet = new walletSchema({ userId: order.userId, balance: 0 });
                }

                // Calculate refund amount considering offers
                let refundAmount = 0;
                
                // If order used a coupon, calculate proportional refund
                if (order.couponUsed) {
                    refundAmount = order.total; // Use the final total that includes coupon discount
                } else {
                    // Calculate refund for each item considering individual offers
                    for (const item of order.items) {
                        let itemPrice = item.subtotal / item.quantity; // Base price per unit
                        let finalPrice = itemPrice;

                        // Apply product-specific offer if exists
                        if (item.product.offer && item.product.offer.isActive) {
                            finalPrice = itemPrice - (itemPrice * item.product.offer.discountValue / 100);
                        }
                        // Apply category offer if no product offer exists
                        else if (item.product.category?.offer && item.product.category.offer.isActive) {
                            finalPrice = itemPrice - (itemPrice * item.product.category.offer.discountValue / 100);
                        }

                        refundAmount += finalPrice * item.quantity;
                    }
                }

                // Round the refund amount
                refundAmount = Math.round(refundAmount);

                // Add the refund to wallet
                wallet.balance += refundAmount;
                
                // Add transaction record
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for Cancelled Order `,
                    date: new Date()
                });

                await wallet.save();
            }
            
            // Update order status
            order.status = "Cancelled";
            await order.save();

            return res.status(200).json({
                message: order.paymentMethod === 'COD' 
                    ? "Order cancelled successfully"
                    : "Order cancelled and amount refunded to wallet"
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occurred", error);
        }
    },
    returnOrder: async(req,res)=>{
        try {
            const orderId = req.params.id;
            const { reason } = req.body;
            const order = await orderSchema.findById(orderId)
                .populate({
                    path: 'items.product',
                    populate: [
                        { path: 'offer' },
                        {
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                });
             
            if(!order) {
                return res.status(404).json({message:"Order not found"});
            }

            // Return products to stock
            for (const item of order.items) {
                await productSchema.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { stock: item.quantity } }
                );
            }

            // Only process refund if payment method is not COD
            if (order.paymentMethod !== 'COD') {
                // Add refund to wallet
                let wallet = await walletSchema.findOne({ userId: order.userId });
                if (!wallet) {
                    wallet = new walletSchema({ userId: order.userId, balance: 0 });
                }

                // Calculate refund amount considering offers
                let refundAmount = 0;
                
                // If order used a coupon, calculate proportional refund
                if (order.couponUsed) {
                    refundAmount = order.total; // Use the final total that includes coupon discount
                } else {
                    // Calculate refund for each item considering individual offers
                    for (const item of order.items) {
                        let itemPrice = item.subtotal / item.quantity; // Base price per unit
                        let finalPrice = itemPrice;

                        // Apply product-specific offer if exists
                        if (item.product.offer && item.product.offer.isActive) {
                            finalPrice = itemPrice - (itemPrice * item.product.offer.discountValue / 100);
                        }
                        // Apply category offer if no product offer exists
                        else if (item.product.category?.offer && item.product.category.offer.isActive) {
                            finalPrice = itemPrice - (itemPrice * item.product.category.offer.discountValue / 100);
                        }

                        refundAmount += finalPrice * item.quantity;
                    }
                }

                // Round the refund amount
                refundAmount = Math.round(refundAmount);

                // Add the refund to wallet
                wallet.balance += refundAmount;
                
                // Add transaction record
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for Returned Order `,
                    date: new Date()
                });

                await wallet.save();
            }

            // Update order status
            order.status = 'Returned';
            order.returnReason = reason;
            await order.save();
             
            return res.status(200).json({
                message: order.paymentMethod === 'COD' 
                    ? "Order returned successfully"
                    : "Order returned and amount refunded to wallet"
            });

        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred",error);
        }  
    },
    loadOrders: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = await userSchema.findById(userId)
            
            // Fetch orders with populated product details including offers
            const orders = await orderSchema.find({ userId })
                .populate({
                    path: 'items.product',
                    populate: [
                        { 
                            path: 'offer',
                        },
                        {
                            path: 'category',
                            populate: { 
                                path: 'offer',
                            }
                        }
                    ]
                })
                .sort({ createdAt: -1 });

            // Process orders to include proper pricing
            const processedOrders = orders.map(order => {
                const items = order.items.map(item => {
                    let basePrice = item.subtotal / item.quantity; // Original price per unit
                    let finalPrice = basePrice;
                    let activeOffer = null;

                    // If product has an active offer
                    if (item.product.offer) {
                        const discount = (basePrice * item.product.offer.discountValue) / 100;
                        finalPrice = basePrice - discount;
                        activeOffer = {
                            type: 'Product',
                            discountValue: item.product.offer.discountValue
                        };
                    }
                    // If category has an active offer (and no product offer)
                    else if (item.product.category?.offer) {
                        const discount = (basePrice * item.product.category.offer.discountValue) / 100;
                        finalPrice = basePrice - discount;
                        activeOffer = {
                            type: 'Category',
                            discountValue: item.product.category.offer.discountValue
                        };
                    }
                    // If order used a coupon
                    else if (order.couponUsed) {
                        // Calculate individual item's share of the coupon discount
                        const totalOrderValue = order.items.reduce((sum, orderItem) => 
                            sum + (orderItem.subtotal), 0);
                        const itemDiscountShare = (item.subtotal / totalOrderValue) * order.couponUsed.discount;
                        finalPrice = basePrice - (itemDiscountShare / item.quantity);
                    }

                    return {
                        ...item.toObject(),
                        originalPrice: Math.round(basePrice),
                        finalPrice: Math.round(finalPrice),
                        activeOffer,
                        hasDiscount: activeOffer || order.couponUsed
                    };
                });

                return {
                    ...order.toObject(),
                    items,
                    hasCouponDiscount: !!order.couponUsed
                };
            });

            res.render('user/orders', { 
                orders: processedOrders, 
                user 
            });

        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred");
        }
    },
    loadOrderView: async (req, res) => {
        try {
            const orderId = req.params.id;
            const userId = req.session.user;
            const user = await userSchema.findById(userId);

            // Fetch order with populated product details including offers
            const order =  await orderSchema.findOne({ _id: orderId, userId }) 
                .populate({
                    path: 'items.product',
                    populate: [
                        { 
                            path: 'offer'
                        },
                        {
                            path: 'category',
                            populate: { 
                                path: 'offer'
                            }
                        }
                    ]
                });

            if (!order) {
                return res.status(404).send("Order not found");
            }

            // Process order items to include proper pricing
            const processedOrder = {
                ...order.toObject(),
                items: order.items.map(item => {
                    let basePrice = item.subtotal / item.quantity; // Original price per unit
                    let finalPrice = basePrice;
                    let activeOffer = null;

                    // If product has an active offer
                    if (item.product.offer) {
                        const discount = (basePrice * item.product.offer.discountValue) / 100;
                        finalPrice = basePrice - discount;
                        activeOffer = {
                            type: 'Product',
                            discountValue: item.product.offer.discountValue
                        };
                    }
                    // If category has an active offer (and no product offer)
                    else if (item.product.category?.offer) {
                        const discount = (basePrice * item.product.category.offer.discountValue) / 100;
                        finalPrice = basePrice - discount;
                        activeOffer = {
                            type: 'Category',
                            discountValue: item.product.category.offer.discountValue
                        };
                    }
                    // If order used a coupon
                    else if (order.couponUsed) {
                        // Calculate individual item's share of the coupon discount
                         const totalOrderValue = order.items.reduce((sum, orderItem) => 
                            sum + (orderItem.subtotal), 0);
                        const itemDiscountShare = (item.subtotal / totalOrderValue) * order.couponUsed.discount;
                        finalPrice = basePrice - (itemDiscountShare / item.quantity);
                    }

                    return {
                        ...item.toObject(),
                        originalPrice: Math.round(basePrice),
                        finalPrice: Math.round(finalPrice),
                        activeOffer,
                        hasDiscount: activeOffer || order.couponUsed
                    };
                }),
                
                hasCouponDiscount: !!order.couponUsed,
                couponUsed: order.couponUsed // Add this to pass coupon info to the view
            };

            res.render('user/orderView', { 
                order: processedOrder,
                user: user,
                helpers: {
                    eq: (v1, v2) => v1 === v2,
                    formatDate: (date) => {
                        return date ? new Date(date).toLocaleDateString() : '--';
                    }
                }
            });

        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred");
        }
    },
    loadForgetPasswordEmail:async(req,res)=>{
      try {
        res.render("user/forgetPasswordEmail")
      } catch (error) {
        console.log(error);
        res.status(500).send("Error Occured",error)
      }  
    },
    forgetPasswordEmail: async (req, res) => {
        try {
            const { email } = req.body;
            
            // Find user with the provided email
            const user = await userSchema.findOne({ email: email });

            if (!user) {
                return res.status(404).json({ 
                    status: false, 
                    message: "Email not found" 
                });
            }

            // Generate OTP and store it temporarily
            const otp = crypto.randomInt(1000, 10000); // 4-digit OTP
            otpStore[email] = { 
                otp: otp, 
                time: Date.now(), 
                email: email,
                forPasswordReset: true // Flag to indicate this is for password reset
            };

            // Send OTP via email
            sendOtpEmail(email, otp);

            return res.status(200).json({ 
                status: true, 
                message: "OTP sent successfully" 
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({ 
                status: false, 
                message: "Error occurred while processing request" 
            });
        }
    },
    loadForgetPassOtp: async (req, res) => {
        try {
            const { email } = req.query;
            res.render('user/forgetPassOtp', { email });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occurred");
        }
    },
    verifyForgetPassOtp: async (req, res) => {
        try {
            const { email, otp } = req.body;
    
            if (!otpStore[email] || !otpStore[email].forPasswordReset) {
                return res.status(400).json({ 
                    status: false, 
                    message: "Invalid OTP request" 
                });
            }
    
            if (otpStore[email].otp == otp) {
                const timeElapsed = Date.now() - otpStore[email].time;
                
                if (timeElapsed > 5 * 60 * 1000) { // 5 minutes expiry
                    delete otpStore[email];
                    return res.status(400).json({ 
                        status: false, 
                        message: "OTP expired" 
                    });
                }
    
                // OTP verified successfully
                return res.status(200).json({ 
                    status: true, 
                    message: "OTP verified successfully" 
                });
    
            } else {
                return res.status(400).json({ 
                    status: false, 
                    message: "Invalid OTP" 
                });
            }
    
        } catch (error) {
            console.error(error);
            return res.status(500).json({ 
                status: false, 
                message: "Error occurred" 
            });
        }
    },
    loadForgetPassword:async(req,res)=>{
        try {
            res.render("user/forgetPassword");
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured",error)
        }
    },
    forgetPassword: async(req,res)=>{
        try {
            const {password} = req.body;
            const email=req.query.email;

            if(!email){
                res.status(404).json({status:false,message:"Email is required"})
            }
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await userSchema.findOneAndUpdate(
                { email: email },
                { $set: { password: hashedPassword }},
                { new: true }
            );

            if(!user) {
                return res.status(400).json({status: false,message: "Error updating password"});
            }

            return res.status(200).json({status: true,message: "Password updated successfully"});

        } catch (error) {
            console.log(error);
            return res.status(500).json({status: false,message: "Error updating password"});
        }
    },
    loadWishlist: async(req,res)=>{
        try {
            const userId = req.session.user;
            const user = await userSchema.findById(userId)
                .populate({
                    path: 'wishlist',
                    populate: [
                        { path: 'offer' },
                        {
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                });
            
            const processedProducts = user.wishlist.map(product => {
                let basePrice = Number(product.price);
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product offer first
                if (product.offer && product.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * product.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: product.offer.discountValue
                    };
                }
                // Then check for category offer
                else if (product.category?.offer && product.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * product.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: product.category.offer.discountValue
                    };
                }

                return {
                    _id: product._id,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    brand: product.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: product.images
                };
            });

            res.render('user/wishlist', {
                user,
                data: processedProducts
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occurred", error);
        }
    },
    resetPassword: async(req,res)=>{
        try {
            const {newPassword,currentPassword}=req.body;
            const userId=req.session.user;
            const user=await userSchema.findById(userId);

            if(!user){
                return res.status(400).json({status:false,message:"User not found"});
            }
            const match=await  bcrypt.compare(currentPassword,user.password);
            if(!match){
                return res.status(400).json({status:false,message:"Current password is incorrect"})
            }
            const hashedPassword=await bcrypt.hash(newPassword,10);
            await userSchema.findByIdAndUpdate(userId,{password:hashedPassword});
            res.status(200).json({status:true,message:"Password updated Successfully"})
        } catch (error) {
            console.log(error);
            res.status(500).json({status:false,message:"Error Occured",error})
        }
    },
    toggleWishlist: async (req, res) => {
        try {
            const userId = req.session.user;
            const productId = req.params.productId;

            if (!userId) {
                return res.status(401).json({success: false,redirect: '/user/login'});
            }

            const user = await userSchema.findById(userId);
            const wishlistIndex = user.wishlist.indexOf(productId);

            if (wishlistIndex === -1) {
                // Add to wishlist
                user.wishlist.push(productId);
                await user.save();
                res.json({
                    success: true,
                    message: 'Added to wishlist'
                });
            } else {
                // Remove from wishlist
                user.wishlist.splice(wishlistIndex, 1);
                await user.save();
                res.json({
                    success: true,
                    message: 'Removed from wishlist'
                });
            }
        } catch (error) {
            console.error('Wishlist toggle error:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating wishlist'
            });
        }
    },
    applyCoupon: async (req, res) => {
        try {
            const { couponCode, total } = req.body;
            const userId = req.session.user;

            // find the coupon
            const coupon = await couponSchema.findOne({ couponCode });

            if (!coupon) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid coupon code'
                });
            }

            // check if coupon is active
            if (!coupon.isActive) {
                return res.status(400).json({
                    status: false,
                    message: 'This coupon is no longer active'
                });
            }

            // check minimum purchase amount
            if (total < coupon.minimumPrice) {
                return res.status(400).json({
                    status: false,
                    message: `Minimum purchase amount of Rs. ${coupon.minimumPrice} required`
                });
            }

            // check if coupon has started and not expired
            const now = new Date();
            if (now < coupon.startDate || now > coupon.endDate) {
                return res.status(400).json({
                    status: false,
                    message: 'This coupon is not valid at this time'
                });
            }

            // calculate discount
            let discount = coupon.discountValue;
            const finalTotal = total - discount;

            // check if user has already used this coupon maximum times
            const usageCount = await orderSchema.countDocuments({
                userId,
                'couponUsed.code': couponCode
            });

            if (usageCount >= coupon.usagePerUser) {
                return res.status(400).json({
                    status: false,
                    message: `You have already used this coupon ${coupon.usagePerUser} times`
                });
            }

            return res.status(200).json({
                status: true,
                message: 'Coupon applied successfully',
                discount: Math.round(discount),
                finalTotal: Math.round(finalTotal)
            });

        } catch (error) {
            console.error('Error applying coupon:', error);
            return res.status(500).json({
                status: false,
                message: 'Error applying coupon'
            });
        }
    },
    loadWallet: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = await userSchema.findById(userId);
            const wallet = await walletSchema.findOne({ userId }).populate('transactions').sort({ 'transactions.date': -1 }); 
            
            // if wallet does not exist, create one
            if (!wallet) {
                const newWallet = new walletSchema({
                    userId,
                    balance: 0,
                    transactions: []
                });
                await newWallet.save();
                return res.render("user/wallet", { user, wallet: newWallet });
            }

            // Sort transactions in LIFO order
            wallet.transactions.sort((a, b) => b.date - a.date);

            res.render("user/wallet", { user, wallet });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occurred", error);
        }
    },
    addWalletMoney: async (req, res) => {
        try {
            const { amount } = req.body;
            const userId = req.session.user;

            // Create Razorpay order
            const options = {
                amount: amount * 100,
                currency: "INR",
                receipt: `wallet_${Date.now()}`
            };

            const razorpayOrder = await razorpayService.orders.create(options);

            res.status(200).json({
                status: true,
                message: "Order Created",
                razorpayOrderId: razorpayOrder.id,
                amount: amount * 100,
                key_id: process.env.RAZORPAY_KEY_ID
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, message: "Error creating order" });
        }
    },
    verifyWalletPayment: async (req, res) => {
        try {
            const { 
                razorpay_payment_id, 
                razorpay_order_id, 
                razorpay_signature,
                amount 
            } = req.body;
            const userId = req.session.user;

            // verify payment signature
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            if (razorpay_signature === expectedSign) {
                // find or create wallet
                let wallet = await walletSchema.findOne({ userId });
                if (!wallet) {
                    wallet = new walletSchema({ userId, balance: 0 });
                }

                // add money to wallet
                wallet.balance += Number(amount);
                
                // add transaction  history
                wallet.transactions.push({
                    type: 'credit',
                    amount: Number(amount),
                    description: 'Added to wallet',
                    date: new Date()
                });

                await wallet.save();

                return res.status(200).json({
                    status: true,
                    message: "Payment verified and wallet updated successfully"
                });
            } else {
                return res.status(400).json({
                    status: false,
                    message: "Invalid payment signature"
                });
            }
        } catch (error) {
            console.error("Payment verification error:", error);
            res.status(500).json({
                status: false,
                message: "Payment verification failed"
            });
        }
    },
    repayOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            const order = await orderSchema.findById(orderId);
            if (!order) {
                console.log("Order not found:", orderId);
                return res.status(404).json({ 
                    status: false,
                    message: "Order not found" 
                });
            }

            // Create new Razorpay order
            const options = {
                amount: Math.round(order.total * 100), // Convert to paise and ensure it's a whole number
                currency: "INR",
                receipt: `order_${Date.now()}`
            };

            const razorpayOrder = await razorpayService.orders.create(options);

            // Update order with new Razorpay order ID
            order.razorpayOrderId = razorpayOrder.id;
            order.paymentStatus = 'Pending';
            await order.save();

            return res.status(200).json({
                status: true,
                message: "Razorpay Order Created",
                razorpayOrderId: razorpayOrder.id,
                amount: options.amount,
                key_id: process.env.RAZORPAY_KEY_ID,
                orderId: order._id
            });
        } catch (error) {
            console.error("Repayment error:", error);
            res.status(500).json({ 
                status: false,
                message: "Failed to create repayment order",
                error: error.message 
            });
        }
    },
    handlePaymentFailure: async (req, res) => {
        try {
            const { orderId } = req.body;
            
            const order = await orderSchema.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    status: false, 
                    message: "Order not found" 
                });
            }
    
            // update order status to failed
            order.paymentStatus = 'Failed';
            await order.save();
    
            res.status(200).json({ 
                status: true, 
                message: "Payment status updated to failed" 
            });
        } catch (error) {
            console.error("Error updating payment status:", error);
            res.status(500).json({ 
                status: false, 
                message: "Error updating payment status" 
            });
        }
    },
    searchProducts: async (req, res) => {
        try {
            const searchTerm = req.query.term;
            const sortOption = req.query.sort || "default";
            const userId = req.session.user;
            const user = userId ? await userSchema.findById(userId) : null;

            const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            let sortCriteria = {};
            if (sortOption === "priceAsc") {
                sortCriteria = { price: 1 };
            } else if (sortOption === "priceDesc") {
                sortCriteria = { price: -1 };
            } else if (sortOption === "newArrivals") {
                sortCriteria = { createdAt: -1 };
            } else if (sortOption === "aToZ") {
                sortCriteria = { name: 1 };
            } else if (sortOption === "zToA") {
                sortCriteria = { name: -1 };
            }

            // find products with sorting
            const products = await productSchema
                .find({
                    name: { $regex: escapedSearchTerm, $options: 'i' },
                    isDeleted: false
                })
                .populate('offer')
                .populate({
                    path: 'category',
                    populate: { path: 'offer' },
                    match: { isBlock: false }
                })
                .sort(sortCriteria)
                .exec();

            // Filter out products with blocked categories
            const filteredProducts = products.filter(product => product.category !== null);

            // Process products like in shop controller
            const processedProducts = filteredProducts.map(data => {
                let basePrice = Math.round(Number(data.price));
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product offer first
                if (data.offer && data.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: data.offer.discountValue
                    };
                }
                // If category has an active offer (and no product offer)
                else if (data.category.offer && data.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: data.category.offer.discountValue
                    };
                }

                return {
                    _id: data._id,
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: data.images,
                    isInWishlist: user ? user.wishlist.includes(data._id) : false
                };
            });

            // render  all  data
            res.render('user/searchResults', {
                searchTerm,
                products: processedProducts,
                user,
                sortOption, // pass sort option to maintain selected state
                helpers: {
                    eq: (v1, v2) => v1 === v2,
                    roundPrice: (price) => Math.round(price)
                }
            });

        } catch (error) {
            console.error('Search error:', error);
            res.status(500).send('Error processing search');
        }
    },
    getSearchSuggestions: async (req, res) => {
        try {
            const searchTerm = req.query.term;
            
            if (!searchTerm || searchTerm.length < 2) {
                return res.json({ suggestions: [] });
            }

            
            const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const products = await productSchema.find({
                name: { $regex: escapedSearchTerm, $options: 'i' },
                isDeleted: false
            })
            .select('name images price')
            .limit(5);

            const suggestions = products.map(product => ({
                _id: product._id,
                name: product.name,
                images: product.images,
                price: product.price
            }));

            res.json({ suggestions });
        } catch (error) {
            console.error('Search suggestion error:', error);
            res.status(500).json({ error: 'Error fetching suggestions' });
        }
    },
    loadMarvalCategory:async(req,res)=>{
        try {
            const sortOption = req.query.sort || "default"; 
            const userId= req.session.user;
            const user= userId ?await userSchema.findById(userId) : null;

            const category = await categorySchema.findOne({ name : /marval/i });

            if(!category){
                return res.status(404).send("Category not found");
            }

            let sortCriteria = {}; 
            if (sortOption === "priceAsc") {
                sortCriteria = { price: 1 }; // price ascending
            } else if (sortOption === "priceDesc") {
                sortCriteria = { price: -1 }; //  price descending
            } else if (sortOption === "newArrivals") {
                sortCriteria = { createdAt: -1 }; //  newest first
            } else if (sortOption === "aToZ") {
                sortCriteria = { name: 1 }; // alphabetically A-Z
            } else if (sortOption === "zToA") {
                sortCriteria = { name: -1 }; // alphabetically Z-A
            }

            const products = await productSchema.find({ category: category._id,isDeleted: false })
                .populate('offer')
                .populate({
                    path: "category",
                    populate: { path: "offer" },
                    match: { isBlock: false }
                })
                .sort(sortCriteria)
                .exec();

            const filterProduct = products.filter((product) => product.category !== null);

            // Map products with rounded prices and offer information
            const processedProducts = filterProduct.map((data) => {
                let basePrice = Math.round(Number(data.price));
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product offer first
                if (data.offer && data.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: data.offer.discountValue
                    };
                }
                // Then check for category offer
                else if (data.category.offer && data.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: data.category.offer.discountValue
                    };
                }

                return {
                    _id: data._id,
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: data.images,
                    isInWishlist: user ? user.wishlist.includes(data._id) : false
                };
            });

            res.render("user/marvalCategory", {
                data: processedProducts,
                user,
                sortOption
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred ",error);
        }
    },
    loadDcComicsCategory:async(req,res)=>{
        try {
            const sortOption = req.query.sort || "default"; 
            const userId= req.session.user;
            const user= userId ?await userSchema.findById(userId) : null;

            const category = await categorySchema.findOne({ name : /dc comics/i });

            if(!category){
                return res.status(404).send("Category not found");
            }

            let sortCriteria = {}; 
            if (sortOption === "priceAsc") {
                sortCriteria = { price: 1 }; // price ascending
            } else if (sortOption === "priceDesc") {
                sortCriteria = { price: -1 }; //  price descending
            } else if (sortOption === "newArrivals") {
                sortCriteria = { createdAt: -1 }; //  newest first
            } else if (sortOption === "aToZ") {
                sortCriteria = { name: 1 }; // alphabetically A-Z
            } else if (sortOption === "zToA") {
                sortCriteria = { name: -1 }; // alphabetically Z-A
            }

            const products = await productSchema.find({ category: category._id,isDeleted: false })
                .populate('offer')
                .populate({
                    path: "category",
                    populate: { path: "offer" },
                    match: { isBlock: false }
                })
                .sort(sortCriteria)
                .exec();

            const filterProduct = products.filter((product) => product.category !== null);

            // Map products with rounded prices and offer information
            const processedProducts = filterProduct.map((data) => {
                let basePrice = Math.round(Number(data.price));
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product offer first
                if (data.offer && data.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: data.offer.discountValue
                    };
                }
                // Then check for category offer
                else if (data.category.offer && data.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: data.category.offer.discountValue
                    };
                }

                return {
                    _id: data._id,
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: data.images,
                    isInWishlist: user ? user.wishlist.includes(data._id) : false
                };
            });

            res.render("user/DcComicsCategory", {
                data: processedProducts,
                user,
                sortOption
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred ",error);
        }
    },
    loadTransformersCategory:async(req,res)=>{
        try {
            const sortOption = req.query.sort || "default"; 
            const userId= req.session.user;
            const user= userId ?await userSchema.findById(userId) : null;

            const category = await categorySchema.findOne({ name : /transformers/i });

            if(!category){
                return res.status(404).send("Category not found");
            }

            let sortCriteria = {}; 
            if (sortOption === "priceAsc") {
                sortCriteria = { price: 1 }; // price ascending
            } else if (sortOption === "priceDesc") {
                sortCriteria = { price: -1 }; //  price descending
            } else if (sortOption === "newArrivals") {
                sortCriteria = { createdAt: -1 }; //  newest first
            } else if (sortOption === "aToZ") {
                sortCriteria = { name: 1 }; // alphabetically A-Z
            } else if (sortOption === "zToA") {
                sortCriteria = { name: -1 }; // alphabetically Z-A
            }

            const products = await productSchema.find({ category: category._id,isDeleted: false })
                .populate('offer')
                .populate({
                    path: "category",
                    populate: { path: "offer" },
                    match: { isBlock: false }
                })
                .sort(sortCriteria)
                .exec();

            const filterProduct = products.filter((product) => product.category !== null);

            // Map products with rounded prices and offer information
            const processedProducts = filterProduct.map((data) => {
                let basePrice = Math.round(Number(data.price));
                let finalPrice = basePrice;
                let activeOffer = null;

                // Check for product offer first
                if (data.offer && data.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Product Offer',
                        discountValue: data.offer.discountValue
                    };
                }
                // Then check for category offer
                else if (data.category.offer && data.category.offer.isActive) {
                    finalPrice = Math.round(basePrice - (basePrice * data.category.offer.discountValue / 100));
                    activeOffer = {
                        type: 'Category Offer',
                        discountValue: data.category.offer.discountValue
                    };
                }

                return {
                    _id: data._id,
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    brand: data.brand,
                    price: basePrice,
                    finalPrice: finalPrice,
                    activeOffer: activeOffer,
                    images: data.images,
                    isInWishlist: user ? user.wishlist.includes(data._id) : false
                };
            });

            res.render("user/transformersCategory", {
                data: processedProducts,
                user,
                sortOption
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred ",error);
        }
    },
    loadLogout: (req, res) => {
        try {
            delete req.session.user;
            res.redirect('/user/login');
        } catch (error) {
            console.log(error);
            res.status(500).send("Error occurred ",error);
        }
    },
    
};

// function to send otp to email
function sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user:process.env.EMAIL, 
            pass:process.env.PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP code is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("error sending email: ",error);
        } else {
            console.log('OTP sent: ', otp );
        }
    }); 

}

