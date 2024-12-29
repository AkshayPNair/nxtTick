const adminSchema=require("../model/adminModel");
const userSchema=require("../model/userModel");
const productSchema=require("../model/productSchema");
const categorySchema=require("../model/categorySchema");
const orderSchema=require('../model/orderSchema');
const couponSchema=require('../model/couponSchema');
const offerSchema=require('../model/offerSchema');
const bcrypt=require("bcrypt");

module.exports={
    //load admin login
    loadLogin:(req,res)=>{
        try {
            
          res.render('admin/login')  
        } catch (error) {
            res.status(500).send("error occured")
        }
    },

    loadAdmin:async (req,res)=>{
        try {
            const {email,password}=req.body
            console.log(`Email: ${email} , Password: ${password}`)

            const admin = await adminSchema.findOne({email: email})
            if(!admin){
                return res.status(400).json({status:false,message:"Invalid Credentials"})
            }

            const match= await bcrypt.compare(password,admin.password)

            if(!match){
                return res.status(400).json({status:false,message:"Password doesn't match"})
            }
            
            req.session.admin=admin.id;

            return res.status(200).json({status:true,message:"Login successfully"})

        } catch (error) {
            res.status(500).send("Error occured")
        }
    },

    loadDashBoard:async (req, res) => {
        try {
            const admin = req.session.admin;
            if (!admin) {
                return res.redirect('/admin/login');
            }

            // Fetch orders with user details and product offers
            const orders = await orderSchema.find({
                status: { $nin: ['Cancelled', 'Returned'] }
            })
                .populate('userId', 'name')
                .populate({
                    path: 'items.product',
                    populate: [
                        { path: 'offer' },
                        { 
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                })
                .sort({ createdAt: -1 });
            
            // Calculate totals
            const totalGross = orders.reduce((sum, order) => {
                // Use original product price without any discounts
                return sum + (order.items[0].product.price * order.items[0].quantity);
            }, 0);

            const totalOfferDiscount = orders.reduce((sum, order) => {
                let discount = 0;
                const originalPrice = order.items[0].product.price * order.items[0].quantity;
                
                if (order.items[0].product.offer) {
                    discount = (originalPrice * order.items[0].product.offer.discountValue) / 100;
                } else if (order.items[0].product.category?.offer) {
                    discount = (originalPrice * order.items[0].product.category.offer.discountValue) / 100;
                }
                return sum + discount;
            }, 0);

            const totalCouponDiscount = orders.reduce((sum, order) => {
                return sum + (order.couponUsed?.discount || 0);
            }, 0);

            const totalNet = totalGross - totalOfferDiscount - totalCouponDiscount;

            // Calculate other statistics
            const statistics = {
                totalOrders: orders.length,
                totalRevenue: totalGross,
                totalDiscount: totalOfferDiscount + totalCouponDiscount
            };

            res.render('admin/dashBoard', { 
                statistics, 
                orders,
                totalGross: Math.round(totalGross),
                totalOfferDiscount: Math.round(totalOfferDiscount),
                totalCouponDiscount: Math.round(totalCouponDiscount),
                totalNet: Math.round(totalNet)
            });
        } catch (error) {
            console.error("Dashboard Error:", error);
            res.status(500).send("Error Occurred");
        }
    },
    loadAllProducts:async (req,res)=>{
        try {
            const products= await productSchema.find({isDeleted:false}).populate('category','name')
            res.render("admin/allProducts",{products})
        } catch (error) {
            console.error("Error fetching customers:", error)
            res.status(500).send("Error Occured")
        }
    },

    loadAddProducts:async(req,res)=>{
        try {
            const categories=await categorySchema.find()
            res.render("admin/addProducts",{categories})
        } catch (error) {
            console.error("Error loading addProducts page:", error);
            res.status(500).send("Error loading the page");
        }
    },

    loadEditProducts:async (req,res)=>{
        try {
            const productId=req.params.id;
            
            const product= await productSchema.findById(productId).populate('category','_id name');
            

            if(!product){
                return res.status(404).send("Product not found")
            }
            const categories=await categorySchema.find({isBlock:false})

            console.log("Product:", product);
            console.log("Categories:", categories);

            res.render('admin/editProducts',{product,categories});
        } catch (error) {
            console.error(error);
            res.status(500).send("Error Occured")
        }
    },

    loadAllCategory:async (req,res)=>{
        try {
            const category= await categorySchema.find({})

            res.render("admin/allCategory",{category})
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },

    loadAddCategory:(req,res)=>{
        try {
            res.render("admin/addCategory")
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },

    loadEditCategory: async(req,res)=>{
        try {
            const categoryId=req.params.id
            const category=await categorySchema.findById(categoryId)
            
            if(!category){
                res.status(400).send("Category not found")
            }
            res.render('admin/editCategory',{category})
        } catch (error) {
            console.error(error)
            res.status(500).send("Error Occured")
        }
    },

    loadCoustmers: async (req,res)=>{
        try {
            const users= await userSchema.find({})

        res.render("admin/coustmers",{users})
        } catch (error) {
            console.error("Error fetching customers:", error);
            res.status(500).send("Error Occured")
        }
    },
    blockandUnblockuser: async (req,res)=>{
        try {
            const userId = req.params.id;
            const { isBlock } = req.body;

            const user = await userSchema.findByIdAndUpdate(userId, { isBlock }, { new: true });

            if (user) {
                return res.status(200).json({ status: true, message: 'User status updated successfully' });
            }

            res.status(404).json({ status: false, message: 'User not found' });
        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },

    blockandUnblockCategory:async (req,res)=>{
        try {
            const categoryId=req.params.id;
            const category=await categorySchema.findById(categoryId)

            if(!category){
                res.status(400).json({status:false,message:"Category not found"})
            }
            category.isBlock=!category.isBlock
            await category.save()

            res.status(200).json({ status: true, message: category.isBlock ? "Category blocked" : "Category unblocked" });
        } catch (error) {
            console.error('Error blocking/unblocking category:', error);
            res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },
    loadDeletedProducts: async (req,res)=>{
        try {
            const products=await productSchema.find({isDeleted:true}).populate('category','name')
            res.render("admin/deletedProducts",{products})
        } catch (error) {
            console.log(error)
            res.status(500).send("Error Occured")
        }
    },
    undoDeleteProducts: async(req,res)=>{
        try {
            const productId = req.params.id;

            const product= await productSchema.findByIdAndUpdate( productId ,{isDeleted:false},{new:true});

            if(product){
                return res.status(200).json({status:true,message:"Undo Delete Successfully"})
            }

            res.status(400).json({status:false,message:"Product not found"});

        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },
    
    loadOrders:async(req,res)=>{
        try {
            const orders=await orderSchema.find({}).populate("items.product").sort({createdAt:-1})
            console.log(orders)
            res.render('admin/allOrders',{orders})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured :",error)
        }
    },
    loadOrderDetail:async (req,res)=>{
        try {
            const orderId=req.params.id;
            const order=await orderSchema.findById(orderId).populate('items.product')
            res.render('admin/orderDetail',{order})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured :",error)
        }
    },
    updateOrderStatus:async(req,res)=>{
        const { status,date } = req.body;
        try {
            let updateData={status}
             // Add specific date fields based on status
            switch(status) {
                case 'Shipped':
                updateData.shippedAt = date;
                break;
                case 'Out for Delivery':
                updateData.outForDeliveryAt = date;
                    break;
                case 'Delivered':
                    updateData.deliveredAt = date;
                    break;
            }
            const order = await orderSchema.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true } // Return the updated document
            );

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }
            res.json({ message: "Order status updated successfully", order });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Error updating order status" });
        }
    },
    loadAllCoupons:async(req,res)=>{
        try {
            const coupons=await couponSchema.find({})
            res.render('admin/allCoupons',{coupons});
        } catch (error) {
           console.log(error);
           res.status(500).send("Error occured",error) 
        }
    },
    loadAddCoupon: async(req,res)=>{
        try {
            res.render('admin/addCoupon')
        } catch (error) {
            console.log(error)
            res.status(500).send("Error Occured",error)
        }
    },
    addCoupon:async(req,res)=>{
        try {
            const {couponTitle,couponCode,discountValue,minimumPrice,usagePerUser,startDate,endDate}=req.body;
            const coupon=new couponSchema({
                couponTitle,
                couponCode:couponCode.toUpperCase(),
                discountValue,
                minimumPrice,
                usagePerUser,
                startDate,
                endDate
            })

            await coupon.save();

            return res.status(200).json({status:true,message:"Coupon Added Successfully"});
        } catch (error) {
            console.log(error);
            return res.status(500).send("Error Occured",error)
        }
    },
    loadEditCoupon:async(req,res)=>{
        try {
            const couponId=req.params.id;
            const coupon=await couponSchema.findById(couponId);
            res.render('admin/editCoupon',{coupon});
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured",error)
        }
    },
    editCoupon:async(req,res)=>{
        try {
            const couponId=req.params.id;
            const {couponTitle,couponCode,discountValue,minimumPrice,usagePerUser,startDate,endDate}=req.body;

            const updateCoupon=await couponSchema.findByIdAndUpdate(couponId,{
                couponTitle,
                couponCode:couponCode.toUpperCase(),
                discountValue,
                minimumPrice,
                usagePerUser,
                startDate,
                endDate,
                updatedAt:Date.now()
            })

            await updateCoupon.save();
            return res.status(200).json({status:true,message:"Coupon Updated Successfully"})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured",error)
        }
    },
    filterOrders: async (req, res) => {
        try {
            const { startDate, endDate, filterType } = req.body;
            let query = {
                status: { $nin: ['Cancelled', 'Returned'] }
            };

            if (filterType) {
                const now = new Date();
                switch (filterType) {
                    case 'day':
                        query.createdAt = { 
                            $gte: new Date(now.setHours(0,0,0,0)),
                            $lt: new Date(now.setHours(23,59,59,999))
                        };
                        break;
                    case 'week':
                        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                        query.createdAt = { 
                            $gte: new Date(weekStart.setHours(0,0,0,0)),
                            $lt: new Date()
                        };
                        break;
                    case 'month':
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        query.createdAt = { 
                            $gte: monthStart,
                            $lt: new Date()
                        };
                        break;
                }
            } else if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lt: new Date(new Date(endDate).setHours(23,59,59,999))
                };
            }

            const orders = await orderSchema.find(query)
                .populate('userId', 'name')
                .populate({
                    path: 'items.product',
                    populate: [
                        { path: 'offer' },
                        { 
                            path: 'category',
                            populate: { path: 'offer' }
                        }
                    ]
                })
                .sort({ createdAt: -1 });

            res.json({ orders });
        } catch (error) {
            console.error("Filter Error:", error);
            res.status(500).json({ error: "Error occurred while filtering orders" });
        }
    },
    toggleCouponStatus: async (req, res) => {
        try {
            const couponId = req.params.id;
            
            // Find the coupon and toggle its status
            const coupon = await couponSchema.findById(couponId);
            if (!coupon) {
                return res.status(404).json({ status: false, message: 'Coupon not found' });
            }

            // Toggle the status
            coupon.isActive = !coupon.isActive;
            await coupon.save();

            return res.status(200).json({ 
                status: true, 
                isActive: coupon.isActive,
                message: coupon.isActive ? 'Coupon unblocked successfully' : 'Coupon blocked successfully'
            });
        } catch (error) {
            console.error('Error toggling coupon status:', error);
            return res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },
    loadAddOffer:async(req,res)=>{
        try {
            const categories=await categorySchema.find({})
            const products=await productSchema.find({isDeleted:false})
            res.render('admin/addOffer',{categories,products})
        } catch (error) {
            console.log(error)
            res.status(500).send("Error Occured",error)
        }
    },
    addOffer:async (req, res) => {
        try {
            const {
                offerTitle,
                offerType,
                productId,
                categoryId,
                discountValue,
                minimumPrice,
                startDate,
                endDate
            } = req.body;

            // Create new offer
            const offer = new offerSchema({
                offerTitle,
                offerType,
                ...(offerType === 'product' ? { productId } : { categoryId }),
                discountValue: Number(discountValue),
                minimumPrice: Number(minimumPrice),
                startDate,
                endDate
            });

            await offer.save();

            if (offerType === 'product') {
                // Get product and calculate discounted price
                const product = await productSchema.findById(productId);
                const discount = (product.price * Number(discountValue)) / 100;
                const discountedPrice = product.price - discount;

                // Update product with offer and calculated discounted price
                await productSchema.findByIdAndUpdate(
                    productId,
                    { 
                        offer: offer._id,
                        discountedPrice: discountedPrice // Direct value instead of function
                    }
                );
            } else if (offerType === 'category') {
                // Update category with offer
                await categorySchema.findByIdAndUpdate(
                    categoryId,
                    { offer: offer._id }
                );

                // Update all products in the category
                const products = await productSchema.find({ category: categoryId });
                
                for (const product of products) {
                    const discount = (product.price * Number(discountValue)) / 100;
                    const discountedPrice = product.price - discount;
                    
                    await productSchema.findByIdAndUpdate(
                        product._id,
                        { discountedPrice: discountedPrice }
                    );
                }
            }

            res.status(200).json({
                status: true,
                message: "Offer added successfully"
            });

        } catch (error) {
            console.error('Error adding offer:', error);
            res.status(500).json({
                status: false,
                message: "Error occurred while adding offer"
            });
        }
    },
    loadAllOffers: async (req, res) => {
        try {
            const offers = await offerSchema.find({})
                .populate('productId', 'name')
                .populate('categoryId', 'name');
            
            res.render('admin/allOffers', { offers });
        } catch (error) {
            console.error('Error loading offers:', error);
            res.status(500).send("Error occurred while loading offers");
        }
    },
    toggleOfferStatus: async (req, res) => {
        try {
            const offerId = req.params.id;
            const offer = await offerSchema.findById(offerId);

            if (!offer) {
                return res.status(404).json({
                    status: false,
                    message: "Offer not found"
                });
            }

            offer.isActive = !offer.isActive;
            await offer.save();

            // If offer is deactivated, remove it from products/categories
            if (!offer.isActive) {
                if (offer.offerType === 'product') {
                    await productSchema.updateOne(
                        { _id: offer.productId },
                        { 
                            $unset: { offer: 1 },
                            discountedPrice: null
                        }
                    );
                } else {
                    await categorySchema.updateOne(
                        { _id: offer.categoryId },
                        { $unset: { offer: 1 } }
                    );
                    await productSchema.updateMany(
                        { category: offer.categoryId },
                        { 
                            $unset: { offer: 1 },
                            discountedPrice: null
                        }
                    );
                }
            }

            return res.status(200).json({
                status: true,
                isActive: offer.isActive,
                message: offer.isActive ? "Offer activated successfully" : "Offer deactivated successfully"
            });

        } catch (error) {
            console.error('Error toggling offer status:', error);
            return res.status(500).json({
                status: false,
                message: "Error occurred while toggling offer status"
            });
        }
    },
    loadEditOffer: async (req, res) => {
        try {
            const offerId = req.params.id;
            const offer = await offerSchema.findById(offerId);
            
            if (!offer) {
                return res.redirect('/admin/allOffers');
            }

            let product = null;
            let category = null;

            if (offer.offerType === 'product') {
                product = await productSchema.findById(offer.productId);
            } else {
                category = await categorySchema.findById(offer.categoryId);
            }

            res.render('admin/editOffer', { 
                offer,
                product,
                category
            });
        } catch (error) {
            console.error('Error loading edit offer page:', error);
            res.redirect('/admin/allOffers');
        }
    },
    editOffer:async (req, res) => {
        try {
            const offerId = req.params.id;
            const { offerTitle, discountValue, startDate, endDate } = req.body;

            // Find the existing offer
            const offer = await offerSchema.findById(offerId);
            if (!offer) {
                return res.status(404).json({
                    status: false,
                    message: "Offer not found"
                });
            }

            // Update offer details
            offer.offerTitle = offerTitle;
            offer.discountValue = Number(discountValue);
            offer.startDate = startDate;
            offer.endDate = endDate;
            offer.updatedAt = Date.now();

            await offer.save();

            // Update discounted prices
            if (offer.offerType === 'product' && offer.isActive) {
                const product = await productSchema.findById(offer.productId);
                if (product) {
                    const discount = (product.price * Number(discountValue)) / 100;
                    const discountedPrice = product.price - discount;
                    await productSchema.findByIdAndUpdate(
                        offer.productId,
                        { discountedPrice: discountedPrice }
                    );
                }
            } else if (offer.offerType === 'category' && offer.isActive) {
                const products = await productSchema.find({ category: offer.categoryId });
                for (const product of products) {
                    const discount = (product.price * Number(discountValue)) / 100;
                    const discountedPrice = product.price - discount;
                    await productSchema.findByIdAndUpdate(
                        product._id,
                        { discountedPrice: discountedPrice }
                    );
                }
            }

            return res.status(200).json({
                status: true,
                message: "Offer updated successfully"
            });

        } catch (error) {
            console.error('Error updating offer:', error);
            return res.status(500).json({
                status: false,
                message: "Error occurred while updating offer"
            });
        }
    },
    loadLogout:(req,res)=>{
        try {
            delete req.session.admin;
            res.redirect("/admin/login")
        } catch (error) {
            console.log(error)
            res.status(500).send("Error occured")
        }
    },
    getSalesData: async (req, res) => {
        try {
            const period = req.query.period;
            const now = new Date();
            let startDate, labels, format;

            switch (period) {
                case 'weekly':
                    startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                    labels = Array.from({length: 7}, (_, i) => {
                        const d = new Date(now.getTime() - ((6-i) * 24 * 60 * 60 * 1000));
                        return d.toLocaleDateString('en-US', { weekday: 'short' });
                    });
                    format = '%Y-%m-%d';
                    break;
                case 'monthly':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    labels = Array.from({length: 30}, (_, i) => {
                        const d = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
                        return d.getDate();
                    });
                    format = '%Y-%m-%d';
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    format = '%Y-%m';
                    break;
            }

            const orders = await orderSchema.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        status: { $nin: ['Cancelled', 'Returned'] }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: format, date: "$createdAt" } },
                        total: { $sum: "$total" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Initialize sales data array with zeros
            const values = new Array(labels.length).fill(0);

            // Fill in actual sales data
            orders.forEach(order => {
                const date = new Date(order._id);
                let index;
                
                switch (period) {
                    case 'weekly':
                        index = 6 - Math.floor((now - date) / (24 * 60 * 60 * 1000));
                        break;
                    case 'monthly':
                        index = date.getDate() - 1;
                        break;
                    case 'yearly':
                        index = date.getMonth();
                        break;
                }
                
                if (index >= 0 && index < values.length) {
                    values[index] = order.total;
                }
            });

            res.json({ labels, values });
        } catch (error) {
            console.error('Error getting sales data:', error);
            res.status(500).json({ error: 'Error fetching sales data' });
        }
    },
}


