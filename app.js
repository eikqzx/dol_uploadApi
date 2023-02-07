const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require("path")
const fs = require("fs");
const nodemon = require('nodemon');
const app = express();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log(req.body.scanFile, "req.scanFile");
        let newPath = `uploads/${req.body.scanFile[0]}`
        fs.mkdirSync(newPath, { recursive: true })
        cb(null, newPath)
    },
    filename: function (req, file, cb) {
        cb(null, req.body.scanFile[1] + path.extname(file.originalname)) //Appending extension
    }
})

const upload = multer({ storage: storage });

// enable CORS
app.use(cors());

// add other middleware
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.post('/api/single', async (req, res) => {
    try {
        const avatar = req.file;
        // make sure file is available
        if (!avatar) {
            res.status(400).send({
                status: false,
                data: 'No file is selected.'
            });
        } else {
            //send response
            res.send({
                status: true,
                message: 'File is uploaded.',
                data: {
                    name: avatar.originalname,
                    desname: avatar.filename,
                    mimetype: avatar.mimetype,
                    size: avatar.size
                }
            });
        }

    } catch (err) {
        res.status(500).send(err);
    }
});

app.put('/api/multi_upload', upload.array('scanFile', 12), (req, res) => {
    try {
        // console.log(req,"req.body");
        // console.log(req.body,"req.params");
        const photos = req.files;
        console.log(photos, "photos");
        // check if photos are available
        if (photos.length == 0) {
            res.status(400).send({
                status: false,
                data: 'No Scan Files is selected.'
            });
        } else {
            let data = [];

            // iterate over all photos
            photos.map(p => data.push({
                name: p.originalname,
                mimetype: p.mimetype,
                size: p.size
            }));

            // send response
            res.send({
                status: true,
                message: 'Scan Files are uploaded.',
                data: data
            });
        }

    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/api/file', (req, res) => {
    const filePath = req.query.filePath;
    fs.readFile(filePath, (err, data) => {
        try {
            if (err) {
                res.status(400).send({
                    status: false,
                    error: 'Failed to read file' + err,
                    path: filePath
                });
                return;
            }

            const fileAsBase64 = data.toString('base64');
            res.send({
                status: true,
                fileAsBase64: fileAsBase64
            });
        } catch (error) {
            res.status(500).send(error);
        }
    });
});


app.listen(8099, () => {
    console.log('Server is running on port 8099');
});

nodemon({
    script: 'app.js'
});