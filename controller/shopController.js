const productSchema=require("../model/productSchema");
const userSchema=require("../model/userModel");

module.exports = {
    loadShopPage: async (req, res) => {
      try {
        const sortOption = req.query.sort || "default"; 
        const userId = req.session.user;
        const user = await userSchema.findById(userId);
  
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
  
        const products = await productSchema
          .find({ isDeleted: false })
          .populate({ path: "category", match: { isBlock: false } })
          .sort(sortCriteria) // Apply sorting
          .exec();
  
        const filterProduct = products.filter((product) => product.category !== null);
  
        const Obj = filterProduct.map((data) => {
          return {
            _id: data._id,
            name: data.name,
            description: data.description,
            category: data.category,
            brand: data.brand,
            price: data.price,
            images: data.images,
          };
        });
  
        // Pass the selected sort option to the view
        res.render("user/shop", { data: Obj, user, sortOption });
      } catch (error) {
        console.log(error);
        res.status(500).send("Error occurred");
      }
    },
  };
  