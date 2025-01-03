const productSchema=require("../model/productSchema");
const userSchema=require("../model/userModel");
const categorySchema = require("../model/categorySchema");

module.exports = {
    loadShopPage: async (req, res) => {
      try {
        const sortOption = req.query.sort || "default"; 
        const categoryFilter = req.query.category || "all";
        const userId = req.session.user;
        const user = userId ? await userSchema.findById(userId) : null;
  
        // Fetch all categories
        const categories = await categorySchema.find({ isBlock: false });

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

        
  
        // Build query
        let query = { isDeleted: false };
        if (categoryFilter !== "all") {
          query.category = categoryFilter;
        }

        const products = await productSchema
          .find(query)
          .populate('offer')  // Populate product-specific offers
          .populate({ 
            path: "category", 
            populate: { path: "offer" }, 
            match: { isBlock: false } 
          })
          .sort(sortCriteria) // Apply sorting
          .exec();
  
        const filterProduct = products.filter((product) => product.category !== null);

        // Map products with rounded prices and offer information
        const Obj = filterProduct.map((data) => {
          // Ensure base price is rounded
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


        
        res.render("user/shop", { 
          data: Obj, 
          user, 
          sortOption,
          categories,
          categoryFilter
        });
      } catch (error) {
        console.error("Shop page error:", error);
        res.status(500).send("Error occurred");
      }
    },
  };
  