const productSchema=require("../model/productSchema.js")
const categorySchema=require("../model/categorySchema.js")
module.exports={
    addProduct: async (req, res) => {
        try {
            
            const { productName,description,category,brand,stock,price} = req.body;
            
            const images = req.files.map(file => file.path);
            
            const newProduct = new productSchema({
                name: productName,
                description: description,
                category: category,
                brand: brand ,
                stock: stock,
                price: price,
                images: images
            });

            const savedProduct = await newProduct.save();
            console.log(savedProduct)
            
            res.status(200).json({status: true,message: "Product added successfully!"});

        } catch (error) {
            
            console.error('Product Add Error:', error);
            res.status(500).json({
                status: false,
                message: "Error adding product",
                error: error.message
            });
        }
    },
    

    updateProducts: async(req,res)=>{
        try {
            const productId=req.params.id;
            const{productName,description,category,brand,stock,price}=req.body;
            
            const updates = {
                name: productName,
                description:description,
                category:category,
                brand:brand,
                stock:stock,
                price:price,
                updatedAt: Date.now(),
              };

            if (req.files && req.files.length > 0) {
                const images = req.files.map((file) => file.path);
                updates.images = images;
            }
             const updateProduct= await productSchema.findByIdAndUpdate(
                productId,
                updates,
                {new:true}
             )

            if(!updateProduct){
                return res.status(404).send("Product not found");
            }

            console.log("updateProduct :",updateProduct);
            return res.status(200).json({ status:true,message:"Product updated Successfully!"})
        } catch (error) {
            console.error(error);
            res.status(500).json({status:false,message:"Server error"})
        }
    },
    
    deleteProduct: async(req,res)=>{
        try {
            const productId=req.params.id;
            const deletedProduct=await productSchema.findByIdAndUpdate(
            productId,
            {isDeleted:true,deletedAt: new Date()},
            {new : true}
        );

        if(!deletedProduct){
            res.status(400).json({status:false,message:"Product not found "})
        }

        res.status(200).json({status:true,message:"Product deleted Successfully",product:deletedProduct})

        } catch (error) {
            console.error("Error soft deleting product:", error);
            res.status(500).json({ status: false, message: "Server error", error: error.message });
        }
    },

    
}