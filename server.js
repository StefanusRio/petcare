const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const app = express()

const secretKey = 'thisisverysecretkey'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jb_petcare'
})

db.connect((err) => {
    if (err) throw err
    console.log('Database connected')
})

const isAuthorized = (request, result, next) => {
    if (typeof(request.headers['x-api-key']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token is not provided'
        })
    }

    let token = request.headers['x-api-key']

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token is invalid'
            })
        }
    })

    next()
}

app.post('/login', (request, result) => {
    let data = request.body

    if (data.username == 'admin' && data.password == 'admin') {
        let token = jwt.sign(data.username + '|' + data.password, secretKey)

        result.json({
            success: true,
            message: 'Login success, welcome back Admin!',
            token: token
        })
    }

    result.json({
        success: false,
        message: 'You are not person with username admin and have password admin!'
    })
})

//Kebutuhan Kucing

app.get('/cats', (request, res) => {
    let sql = `
    select * from cats
    `

    db.query(sql, (err, result) => {
        if (err) throw err
        res.json({
            success:true,
            message: "Data berhasil didapat",
            data: result
        })
    })
})
    
app.post('/cats', isAuthorized, (request, result) => {
    let data = request.body

    let sql = `
        insert into cats (nama_barang, harga, stock)
        values ('`+data.nama_barang+`', '`+data.harga+`', '`+data.stock+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil ditambahkan'
    })
})

app.put('/cats/:id', isAuthorized, (request, result) => {
    let data = request.body

    let sql = `
        update cats
        set nama_barang = '`+data.nama_barang+`', harga = '`+data.harga+`', stock = '`+data.stock+`'
        where id = `+request.params.id+`
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil diubah'
    })
})

app.delete('/cats/:id', isAuthorized, (request, result) => {
    let sql = `
        delete from cats where id = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil dihapus'
    })
})

//Data customer

app.get('/customers', isAuthorized, (req, res) => {
    let sql = `
    select * from customers
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Berhasil mendapatkan data pembeli",
            data: result
        })
    })
})

app.get('/customers/:id', isAuthorized, (req, res) => {
    let sql = `
    select * from customers
    where id = `+req.params.id+`
    limit 1
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Data pembeli berhasil didapat",
            data: result[0]
        })
    })
})

app.post('/customers', isAuthorized, (req, res) => {
    let data = req.body

    let sql = `
    insert into customers (nama, kontak, email, kota)
    values ('`+data.nama+`', '`+data.kontak+`', '`+data.email+`', '`+data.kota+`')
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Data pembeli berhasil ditambahkan",
            data: result
        })
    })
})


app.put('/customers/:id', isAuthorized, (req, res) => {
    let data = req.body

    let sql = `
    update customers
    set nama = '`+data.nama+`', kontak = '`+data.kontak+`', email = '`+data.email+`', kota = '`+data.kota+`'
    where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Data pembeli berhasil diubah",
            data: result
        })
    })
})

app.delete('/customers/:id', isAuthorized, (req, res) => {
    let sql = `
    delete from customers
    where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Data pembeli berhasil dihapus",
            data: result
        })
    })
})

//TRANSAKSI
app.get('/customers/:id/cats', isAuthorized, (req, res) => {
    db.query(`
        select cats.id, cats.nama_barang, cats.harga
        from customers
        right join transaksi on customers.id = transaksi.customer_id
        right join cats on transaksi.cat_id = cats.id
        where customers.id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "Berhasil mendapatkan data transaksi",
            data: result
        })
    })
})

app.post('/cats/:id/take', isAuthorized, (req, res) => {
    let data = req.body

    db.query(`
        insert into transaksi (customer_id, cat_id)
        values ('`+data.customer_id+`', '`+req.params.id+`')
    `, (err, result) => {
        if (err) throw err
    })

    db.query(`
        update cats
        set stock = stock - 1
        where id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })

    res.json({
        message: "Berhasil menambahkan data transaksi"
    })
})

app.delete('/transaksi/:id', isAuthorized, (req, res) => {
    let sql = `
        delete from transaksi
        where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err
        
        res.json({
            message: "Berhasil menghapus data transaksi",
            data: result
        })
    })
})

app.listen(3000, () => {
    console.log('App is running on port 3000')
})