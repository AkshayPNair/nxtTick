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
            const productId = req.params.id;
            const {productName, description, category, brand, stock, price} = req.body;
            
            // Initialize final images array with existing images
            const existingProduct = await productSchema.findById(productId);
            let finalImages = [...existingProduct.images];

            // Process each position (1-4)
            for (let i = 1; i <= 4; i++) {
                // Check for new uploaded image at this position
                if (req.files && req.files[`image_${i}`]) {
                    finalImages[i-1] = req.files[`image_${i}`][0].path;
                }
                // Check for existing image at this position
                else if (req.body[`existingImage_${i}`]) {
                    finalImages[i-1] = req.body[`existingImage_${i}`];
                }
                // If neither exists, set to null or remove
                else {
                    finalImages[i-1] = null;
                }
            }

            // Remove any null values from the array
            finalImages = finalImages.filter(img => img);

            const updateProduct = await productSchema.findByIdAndUpdate(
                productId,
                {
                    name: productName,
                    description,
                    category,
                    brand,
                    stock,
                    price,
                    images: finalImages,
                    updatedAt: Date.now()
                },
                {new: true}
            );

            if(!updateProduct) {
                return res.status(404).json({status: false, message: "Product not found"});
            }

            return res.status(200).json({status: true, message: "Product updated Successfully!"});
        } catch (error) {
            console.error(error);
            res.status(500).json({status: false, message: "Server error"});
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