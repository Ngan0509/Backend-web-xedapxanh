import pool from "../configs/connectDB";
import * as emailService from "./emailService"
import { v4 as uuidv4 } from 'uuid';
require('dotenv').config()

const buildURLEmail = (token) => {
    let result = `${process.env.URL_REACT}/home/cart/ordercomplete?token=${token}`
    return result
}
const handleGetAllCheckout = (checkoutId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let checkouts = []
            if (!checkoutId) {
                resolve({
                    errCode: 1,
                    errMessage: 'missing parameter'
                })
            }
            if (checkoutId === "All") {
                const [rows, fields] = await pool.execute('SELECT * FROM checkout')
                checkouts = rows
            }

            const [clients, b] = await pool.execute('SELECT id, fullname, email, phoneNumber, genderId FROM client')

            const [allcode, c] = await pool.execute('SELECT keyMap, valueEn, valueVi FROM allcodeuser')

            let result = checkouts.map((checkout) => {
                let clientData = {}
                if (clients.length > 0) {
                    clients.forEach(client => {
                        if (client.id === checkout.client_id) {
                            clientData = {
                                fullname: client.fullname,
                                email: client.email,
                                phoneNumber: client.phoneNumber,
                                genderId: client.genderId
                            }
                        }
                    })
                }

                let deliveryData = {}, paymentData = {}
                allcode.forEach((item) => {
                    if (item.keyMap === checkout.delivery_id) {
                        deliveryData = {
                            valueEn: item.valueEn,
                            valueVi: item.valueVi
                        }
                    }

                    if (item.keyMap === checkout.payment_id) {
                        paymentData = {
                            valueEn: item.valueEn,
                            valueVi: item.valueVi
                        }
                    }
                })
                return {
                    ...checkout,
                    clientData,
                    deliveryData,
                    paymentData
                }
            })

            resolve({
                errCode: 0,
                errMessage: 'Get data is success',
                data: result
            })
        } catch (error) {
            reject(error)
        }
    })
}

const handleCreateNewCheckout = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let token = uuidv4(); // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

            const { noi_nhan, ghi_chu, city_id, district_id, delivery_id, payment_id, client_id, sum_price, date, lang, statusId } = data

            await pool.execute(
                'INSERT INTO checkout(noi_nhan, ghi_chu, city_id, district_id, delivery_id, payment_id, client_id, sum_price, date, statusId, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [noi_nhan, ghi_chu, city_id, district_id, delivery_id, payment_id, client_id, sum_price, date, statusId, token]
            );

            const [checkouts, a] = await pool.execute('SELECT id FROM checkout WHERE token = ?', [token])
            const checkout_id = checkouts[0].id

            const [carts, b] = await pool.execute('SELECT * FROM cart')

            if (carts && carts.length > 0) {
                carts.forEach(async (item) => {
                    const { id, product_id, type, so_luong, price, sum_price } = item

                    await pool.execute(
                        'INSERT INTO detail_order(checkout_id, product_id, type, so_luong, price, sum_price) VALUES (?, ?, ?, ?, ?, ?)',
                        [checkout_id, product_id, type, so_luong, price, sum_price]
                    );
                })

                await pool.execute('DELETE FROM cart')
            }

            let [deliverys, c] = await pool.execute('SELECT * FROM allcodeuser WHERE keyMap = ?', [delivery_id])

            let [payments, d] = await pool.execute('SELECT * FROM allcodeuser WHERE keyMap = ?', [payment_id])

            let [clients, e] = await pool.execute('SELECT * FROM client WHERE id = ?', [client_id])

            let [orderDetailArr, f] = await pool.execute('SELECT * FROM detail_order WHERE checkout_id = ?', [checkout_id])

            const [bicycles, g] = await pool.execute('SELECT id, name, image, price_new, price_old FROM bicycle')

            let orderDetails = orderDetailArr.map((item) => {
                let productData = {}
                bicycles.forEach(bicycle => {
                    if (bicycle.id === item.product_id) {
                        productData = {
                            name: bicycle.name,
                            image: bicycle.image,
                            price_new: bicycle.price_new,
                            price_old: bicycle.price_old,
                        }
                    }
                })
                return {
                    ...item,
                    productData
                }
            })

            let deliveryData = {}, paymentData = {}, clientData = {}

            clientData = clients[0]

            deliveryData = {
                valueVi: deliverys[0].valueVi,
                valueEn: deliverys[0].valueEn
            }

            paymentData = {
                valueVi: payments[0].valueVi,
                valueEn: payments[0].valueEn
            }

            let dateData = new Date(Number(date))

            await emailService.sendSimpleEmail({
                recieverEmail: clientData.email,
                noi_nhan,
                ghi_chu,
                sum_price,
                clientName: clientData.fullname,
                deliveryData,
                paymentData,
                orderDetails,
                dateData,
                lang,
                redirect: buildURLEmail(token)
            })

            resolve({
                errCode: 0,
                errMessage: "Create new checkout is success"
            })


        } catch (error) {
            reject(error)
        }
    })
}

const handleUpdateStatusIdCheckout = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { token } = data
            const [rows, fields] = await pool.execute('SELECT * FROM checkout WHERE token = ?', [token])
            let checkout = rows[0]
            if (!checkout) {
                resolve({
                    errCode: 2,
                    errMessage: "checkout is not found"
                })
            }
            await pool.execute('UPDATE checkout SET statusId= ? where token = ?',
                ['S2', token]
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
    handleCreateNewCheckout, handleGetAllCheckout, handleUpdateStatusIdCheckout
}