import pool from "../configs/connectDB";
import bcrypt from 'bcryptjs';
const salt = bcrypt.genSaltSync(10);


const handleLogInClient = (email, password) => {
    return new Promise(async (resolve, reject) => {
        try {
            let userData = {}
            let isExist = await checkUserEmail(email)
            if (isExist) {
                let [rows, fields] = await pool.execute('SELECT * FROM client WHERE email = ?', [email])
                let user = rows[0]
                if (user) {
                    let checkPass = bcrypt.compareSync(password, user.password)
                    let imageBase64 = ''
                    if (user.image) {
                        imageBase64 = Buffer.from(user.image, 'base64').toString('binary')
                    }
                    if (checkPass) {
                        userData = {
                            errCode: 0,
                            errMessage: "Ok",
                            user: {
                                id: user.id,
                                email: user.email,
                                fullname: user.fullname,
                                phoneNumber: user.phoneNumber,
                                image: imageBase64
                            }
                        }
                    } else {
                        userData = {
                            errCode: 3,
                            errMessage: "Wrong password",
                        }
                    }
                } else {
                    userData = {
                        errCode: 2,
                        errMessage: "User is not found!"
                    }
                }
            } else {
                userData = {
                    errCode: 4,
                    errMessage: "Your email is not exist in our system, please try other email"
                }
            }
            resolve(userData)
        } catch (error) {
            reject(error)
        }
    })
}

const checkUserEmail = (userEmail) => {
    return new Promise(async (resolve, reject) => {
        try {
            let [rows, fields] = await pool.execute('SELECT * FROM client WHERE email = ?', [userEmail])
            let user = rows[0]
            if (user) {
                resolve(true)
            } else {
                resolve(false)
            }
        } catch (error) {
            reject(error)
        }
    })
}

const handleSignUpClient = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let isExist = await checkUserEmail(data.email)
            if (isExist) {
                resolve({
                    errCode: 1,
                    errMessage: "your email is exist, please try other email"
                })
            } else {
                let hashPasswordFromBcrypt = await hashUserPassword(data.password)
                await pool.execute(
                    'INSERT INTO client(fullname, email, password ,phoneNumber, genderId) VALUES (?, ?, ?, ?, ?)',
                    [data.fullname, data.email, hashPasswordFromBcrypt, data.phoneNumber, data.gender]
                );

                resolve({
                    errCode: 0,
                    errMessage: "Create new client is success"
                })
            }


        } catch (error) {
            reject(error)
        }
    })
}

const hashUserPassword = (password) => {
    return new Promise((resolve, reject) => {
        try {
            let hashPassword = bcrypt.hashSync(password, salt);
            resolve(hashPassword)
        } catch (error) {
            reject(error)
        }
    })
}

const handleDeleteNewClient = (clientId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [rows, fields] = await pool.execute('SELECT * FROM client WHERE id = ?', [clientId])
            let client = rows[0]
            if (!client) {
                resolve({
                    errCode: 2,
                    errMessage: "client is not found"
                })
            }
            await pool.execute('DELETE FROM client WHERE id = ?', [clientId])

            resolve({
                errCode: 0,
                errMessage: "Delete succeed!"
            })
        } catch (error) {
            reject(error)
        }
    })
}

const handleUpdateNewClient = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let clientId = data.id
            if (!clientId) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing parameters"
                })
            }
            const [rows, fields] = await pool.execute('SELECT * FROM client WHERE id = ?', [clientId])
            let client = rows[0]
            if (!client) {
                resolve({
                    errCode: 2,
                    errMessage: "client is not found"
                })
            }
            await pool.execute('UPDATE client SET fullname= ?, image= ?, genderId= ?, birthday= ? where id = ?',
                [data.fullname, data.image, data.gender, data.birthday, clientId]
            );
            resolve({
                errCode: 0,
                errMessage: "Update data is succeed!"
            })
        } catch (error) {
            reject(error)
        }
    })
}

export {
    handleLogInClient,
    handleSignUpClient,
    handleUpdateNewClient,
    handleDeleteNewClient
}