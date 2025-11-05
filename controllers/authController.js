import fs from "fs"; 
import path from "path";
import bcrypt from  "bcryptjs"
import jwt from "jsonwebtoken"; 
import dotenv from "dotenv"; 

dotenv.config(); 

const __dirname = path.resolve(); 

console.log("the __dirname is", __dirname);


const userFile= path.join(__dirname , "data", "users.json"); 

const readUsers = ()=>{
    if(!fs.existsSync((userFile)))return []; 

    const data = fs.readFileSync(userFile, "utf-8");
    return JSON.parse(data);
}

const writeUsers = (data)=>{
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2));
}

export const registerUser = (req , res)=>{

    const  data = req.body; 

    const name = data?.name; 
    const email = data?.email;
    const password = data?.password;
    const role = data?.role

    const users = readUsers();

    const existingUser = users.find((user)=> user.email === email);


    if(existingUser){
        return res.status(400).json({message : "Users already  exists" , "success":false}); 
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = {
        user_id : Date.now() , 
        name  : name , 
        email : email , 
        password : hashedPassword ,   
        role :  role      
    }

    users.push(newUser); 
    writeUsers (users) ;

    return res.status(201).json({
        "message"  :"Users registration  done successfully", 
        "success" : true, 
    })
}

export const loginUser = (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(400).json({ message: "Invalid email or password", success: false });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password", success: false });
    }

    const token = jwt.sign({ id: user.user_id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });

    if (user.role === 'ambulance-driver') {
        return res.status(200).json({
            message: "Login successful",
            token,
            success: true,
            name: user.name,
            user_role: user.role,
            user_id: user.user_id,
            user_email: user.email,
            ambulance_id: user.ambulance_id,
            mobilenumber: user.mobilenumber
        });
    }

    return res.status(200).json({
        message: "Login successful",
        token,
        success: true,
        name: user.name,
        user_role: user.role,
        user_id: user.user_id,
        user_email: user.email,
        mobilenumber: user.mobilenumber
    });
};
