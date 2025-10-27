// const userSchema=require('../model/userModel');

// module.exports={
//     addUser: (data) => {
//         return new Promise((resolve, reject) => {
//             const userobj = new userSchema(data);
//             userobj.save()
//                 .then((data) => {
//                     if (data) {
//                         resolve({ status: true });
//                     } else {
//                         resolve({ status: false });
//                     }
//                 })
//                 .catch((err) => {
//                     reject(err); // Reject the promise in case of an error
//                 });
//         });
//     }
// };