const addressSchema=require("../model/addressSchema")

module.exports={
    addAddress:async(req,res)=>{
        try {
            const {name,phone,pinCode,addressLine1,addressLine2,city,state,country}=req.body;
            const userId=req.session.user;
            const isDefault = req.body.isDefault === "on";

            const newAddress= new addressSchema({
                userId,
                name,
                phone,
                pinCode,
                addressLine1,
                addressLine2,
                city,
                state,
                country,
                isDefault
            });

            if(isDefault){
                await addressSchema.updateMany({userId},{$set:{isDefault:false}})
            }
            const savedAddress=await newAddress.save();
            res.status(200).json({message:"Address added successfully",address:savedAddress})
            } catch (error) {
                console.log(error);
                res.status(500).json({ message: 'Failed to add address', error: error.message });
                
            }
    },
    editAddress:async(req,res)=>{
        try {
            const addressId=req.params.id;
            const {name,phone,pinCode,addressLine1,addressLine2,city,state,country}=req.body;
            const isDefault = req.body.isDefault === "on";

            const updates={
                name,
                phone,
                pinCode,
                addressLine1,
                addressLine2,
                city,
                state,
                country,
                isDefault,
                updatedAt:Date.now()
            }

            if (isDefault) {
                await addressSchema.updateMany({ userId: req.session.user }, { $set: { isDefault: false } });
            }

            const updateAddress= await addressSchema.findByIdAndUpdate(
                addressId,
                updates,
                {new:true}
            )

            if(!updateAddress){
                return res.status(404).json({message:"Address not found"});
            }

            return res.status(200).json({message:"Address updated successfully",address:updateAddress})

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: 'Failed to update address', error: error.message });
        }

    },
    deleteAddress:async(req,res)=>{
        try {
            const addressId=req.params.id;
            const deleteProduct= await addressSchema.findByIdAndDelete(addressId)
            if(!deleteProduct){
                res.status(404).json({message:"Address not found"})
            }
            return res.status(200).json({message:"Address deleted successfully"})
        } catch (error) {
            console.log(error);
            res.status(500).json({message:"Failed to delete address",error:error.message})
        }
    },
}