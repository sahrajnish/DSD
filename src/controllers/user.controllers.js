import User from "../models/user.models.js";
import SchoolSchema from "../models/school.models.js";
import TeachersSchema from "../models/teachers.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import MessageSchema from "../models/message.models.js";
import jwt from "jsonwebtoken";

const handleUserlogin = async (req, res) => {
    const { school_id, password } = req.body;

    if(!school_id || !password) {
        return res.status(404).json({
            response: "error",
            message: "Credentials are required to login"
        })
    }

    try {
        const userExist = await User.findOne({ school_id: school_id });
        if (!userExist) {
            return res.status(404).json({
                response: "error",
                message: "User not found"
            })
        }
        console.log(userExist);

        const isPasswordValid = userExist.password === password;
        if (!isPasswordValid) {
            return res.status(404).json({
                response: "error",
                message: "Invalid password"
            })
        }

        const accessToken = jwt.sign(
            {"id": userExist._id},
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = jwt.sign(
            {"id": userExist._id},
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );

        userExist.refreshToken = refreshToken;
        await userExist.save();

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            response: "success",
            data: {
                id: userExist.school_id,
                accessToken: accessToken
            }
        })
    } catch (error) {
        return res.status(404).json({
            response: "error",
            message: error
        })
    }
}

const handleAboutUsUpdate = async (req, res) => {
    const { title, description } = req.body;
    const file = req.file;

    try {
        const schoolAboutUs = await SchoolSchema.findOne({ schoolName: "DSD" });

        if (file && schoolAboutUs?.aboutUs?.image) {
            const segment = schoolAboutUs.aboutUs.image.split('/');
            const fileWithoutExtension = segment[segment.length - 1];
            const publicId = fileWithoutExtension.split('.')[0];

            const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
        }

        let imgURL = ""

        if (file) {
            const uploadResult = await uploadOnCloudinary(file.path);
            imgURL = uploadResult?.secure_url || ""
        }

        const updatedData = {};
        if (title) updatedData["aboutUs.title"] = title;
        if (description) updatedData["aboutUs.description"] = description;
        if (imgURL) updatedData["aboutUs.image"] = imgURL;

        await SchoolSchema.findOneAndUpdate({ schoolName: "DSD" }, {
            $set: updatedData
        }, {
            new: true
        });

        const data = await SchoolSchema.findOne({ schoolName: "DSD" });

        return res.status(200).json({
            response: "success",
            updates: data
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while updating..."
        })
    }
}

const handleGetAboutUs = async (req, res) => {
    try {
        const data = await SchoolSchema.findOne({ schoolName: "DSD" });
        return res.status(200).json({
            response: "success",
            aboutUs: data.aboutUs
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while fetching About us"
        })
    }
}

const handleAddTeacher = async (req, res) => {
    const { name, designation } = req.body;
    const file = req.file;

    try {
        let imgUrl = "";

        if (file) {
            const uploadResult = await uploadOnCloudinary(file.path);
            imgUrl = uploadResult?.secure_url || "";
        }

        const teacher = await TeachersSchema.create({ name: name, designation: designation, profileImage: imgUrl });

        console.log(teacher);

        return res.status(200).json({
            response: "success",
            message: "Teacher details added successfully",
            detail: teacher
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while adding teacher details."
        })
    }
}

const handleGetAllTeachers = async (req, res) => {
    try {
        const teachers = await TeachersSchema.find({});
        return res.status(200).json({
            response: "success",
            allTeachers: teachers
        })
    } catch (error) {
        return res.send(500).json({
            response: "error",
            message: "Something went wrong while fetching teachers details"
        })
    }
}

const handleEditTeacher = async (req, res) => {
    const { id } = req.params;
    const { updatedName, updatedDesignation } = req.body;
    const file = req.file;

    console.log(file);

    try {
        const teacher = await TeachersSchema.findById({ _id: id });

        if (file && teacher.profileImage) {
            const segment = teacher.profileImage.split('/');
            const fileNameWithExtension = segment[segment.length - 1];
            const publiId = fileNameWithExtension.split('.')[0];

            const result = await cloudinary.uploader.destroy(publiId, { invalidate: true });
        }

        let imgUrl = "";

        if (file) {
            const uplaodedFile = await uploadOnCloudinary(file.path);
            imgUrl = uplaodedFile?.secure_url || "";
        }

        const updatedData = {};
        if (updatedName) updatedData.name = updatedName;
        if (updatedDesignation) updatedData.designation = updatedDesignation;
        if (imgUrl) updatedData.profileImage = imgUrl

        const updatedTeacher = await TeachersSchema.findOneAndUpdate({ _id: id }, updatedData, { new: true });
        return res.status(200).json({
            response: "success",
            message: "Teacher details updated successfully",
            teacherDetails: updatedTeacher
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while updating teacher details"
        })
    }
}

const handleDeleteTeacher = async (req, res) => {
    const { id } = req.params;
    try {
        const teacher = await TeachersSchema.findById({ _id: id });

        if (teacher.profileImage) {
            const segment = teacher.profileImage.split('/');
            console.log(segment);
            const fileNameWithExtension = segment[segment.length - 1];
            const publicId = fileNameWithExtension.split('.')[0];
            const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
            console.log(result);
        }
        await TeachersSchema.findByIdAndDelete({ _id: id });
        const updatedTeachers = await TeachersSchema.find({});
        return res.status(200).json({
            response: "success",
            message: "Teacher details deleted",
            allTeachers: updatedTeachers
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while deleting teacher details"
        })
    }
}

const handleUpdateAddress = async (req, res) => {
    const { addressLine1, addressLine2, city, pin, state } = req.body;

    const updatedData = {};

    if (addressLine1) updatedData["address.addressLine1"] = addressLine1;
    if (addressLine2) updatedData["address.addressLine2"] = addressLine2;
    if (city) updatedData["address.city"] = city;
    if (pin) updatedData["address.pin"] = pin;
    if (state) updatedData["address.state"] = state;

    try {
        const d = await SchoolSchema.findOneAndUpdate({ schoolName: "DSD" }, {
            $set: updatedData
        }, {
            new: true
        });

        console.log(d);

        return res.status(200).json({
            response: "success",
            message: "School address updated."
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while updating address."
        })
    }
}

const handleGetAddress = async (req, res) => {
    try {
        const data = await SchoolSchema.findOne({ schoolName: "DSD" });
        const address = data.address;
        return res.status(200).json({
            response: "success",
            address: address
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while fetching address"
        })
    }
}

const handleUpdateMapAddress = async (req, res) => {
    const { mapLocation } = req.body;
    try {
        await SchoolSchema.findOneAndUpdate({ schoolName: "DSD" }, {
            $set: { mapAddress: mapLocation }
        }, {
            new: true
        })
        return res.status(200).json({
            response: "success",
            message: "Map updated"
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while updating map address"
        })
    }
}

const handleGetMapAddress = async (req, res) => {
    try {
        const fetchedResponse = await SchoolSchema.findOne({ schoolName: "DSD" });
        // console.log("response: ", res?.mapAddress);
        const data = fetchedResponse?.mapAddress;
        return res.status(200).json({
            response: "success",
            mapAddress: data
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while fetching map address",
            err: error
        })
    }
}

const handleContactUsMessage = async (req, res) => {
    const data = req.body;
    try {
        await MessageSchema.create(data);
        return res.status(200).json({
            response: "success",
            message: "Message sent, Our staff will contact you soon"
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while sending message"
        })
    }
}

const handleGetAllMessage = async (req, res) => {
    try {
        const result = await MessageSchema.find({});
        return res.status(200).json({
            response: "success",
            messages: result
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while fetching messages"
        })
    }
}

const handleUpdateMessageStatus = async (req, res) => {
    const { id } = req.params;

    try {
        await MessageSchema.findOneAndUpdate({_id: id}, {
            status: "Contacted"
        }, {
            new: true
        })

        const allMessage = await MessageSchema.find({});
        return res.status(200).json({
            response: "success",
            message: "Status changed",
            allMessage: allMessage
        })
    } catch (error) {
        return res.status(500).json({
            response: "error",
            message: "Something went wrong while changing status of message"
        })
    }
}

const handleDeleteMessage = async (req, res) => {
    const { id } = req.params;
    
    if(!id) {
        return res.status(404).json({
            response: "error",
            message: "ID cannot be empty"
        })
    }

    try {
        const messageExist = await MessageSchema.findById({ _id: id });
        if(!messageExist) {
            return res.status(404).json({
                response: "error",
                response: "Invalid ID"
            })
        }

        await MessageSchema.findOneAndDelete({ _id: id });
        
        const allMessage = await MessageSchema.find({});

        return res.status(200).json({
            response: "success",
            allMessages: allMessage
        })
    } catch (error) {
        console.log(error); 
        return res.status(500).json({
            response: "error",
            message: "Error Deleting message"
        })
    }
}

const handleLogout = async (req, res) => {
    const refreshToken = req.cookies.jwt;
    if(!refreshToken) {
        return res.status(204);
    }

    try {
        await User.findOneAndUpdate({ refreshToken: refreshToken }, {
            refreshToken: null
        });
    
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: true,
            sameSite: "Strict"
        })
    
        return res.status(200).json({
            response: "success",
            message: "Logout successful"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            response: "error",
            message: "Internal server error"
        })
    }
}

const handleRefreshToken = async (req, res) => {
    const refreshToken = req.cookies.jwt;
    if (!refreshToken) {
        // No cookie, so the user is not logged in. This is not an error.
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // 2. Find the user in the DB who owns this token
        const user = await User.findOne({ refreshToken: refreshToken }).exec();
        if (!user) {
            // The token is not in our database (it's either stolen or old/logged out)
            return res.status(403).json({ message: 'Forbidden' });
        }

        // 3. Verify the token is not expired and is legitimate
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err || user._id.toString() !== decoded.id) {
                    // The token is expired or doesn't belong to this user
                    return res.status(403).json({ message: 'Forbidden' });
                }

                // 4. Token is valid, generate a NEW access token
                const accessToken = jwt.sign(
                    { "id": user._id },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
                );

                // 5. Send the new access token back to the client
                res.status(200).json({ accessToken });
            }
        );

    } catch (error) {
        console.error("Refresh Token Controller Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

export {
    handleUserlogin,
    handleAboutUsUpdate,
    handleGetAboutUs,
    handleAddTeacher,
    handleGetAllTeachers,
    handleEditTeacher,
    handleDeleteTeacher,
    handleUpdateAddress,
    handleGetAddress,
    handleUpdateMapAddress,
    handleGetMapAddress,
    handleContactUsMessage,
    handleGetAllMessage,
    handleUpdateMessageStatus,
    handleDeleteMessage,
    handleLogout,
    handleRefreshToken
}