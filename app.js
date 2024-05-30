const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require("path")
const fs = require("fs");
const nodemon = require('nodemon');
const app = express();
const sharp = require('sharp');
var formidable = require('formidable');
var util = require('util');

app.use(express.static(__dirname));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Credentials", true);
    next();
});

const readFileExists = async (path) => {
    await fs.readFile(path, (err, data) => {
        console.log("========= readFileExists ===========");
        try {
            const fileAsBase64 = data.toString('base64');
            console.log(fileAsBase64, "readFileExists");
            return fileAsBase64;
        } catch (err) {
            return err
        }
    });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log(req.body.scanFile, "req.scanFile");
        let newPath = `S:${req.body.scanFile[0]}`
        fs.mkdirSync(newPath, { recursive: true })
        cb(null, newPath)
    },
    filename: function (req, file, cb) {
        cb(null, req.body.scanFile[1]) //Appending extension
    }
})

const storageByPath = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log(req.body.scanFile, "req.scanFile");
        let newPath = `${req.body.scanFile[0]}`
        fs.mkdirSync(newPath, { recursive: true })
        cb(null, newPath)
    },
    filename: function (req, file, cb) {
        cb(null, req.body.scanFile[1]) //Appending extension
    }
})

const fileFilter = (req, file, cb) => {
    const filePath = `S:${req.body.scanFile[0]}/${req.body.scanFile[1] + path.extname(file.originalname)}`;
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlinkSync(filePath);
        }
        cb(null, true);
    });
};

const fileFilterByPath = (req, file, cb) => {
    const filePath = `${req.body.scanFile[0]}${req.body.scanFile[1] + path.extname(file.originalname)}`;
    // console.log(filePath, "fileFilterByPath");
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlinkSync(filePath);
        }
        cb(null, true);
    });
};

const upload = multer({ storage, fileFilter });

const uploadByPath = multer()

const uploadCiraCore = multer({ 
    storage: storageByPath,
    fileFilter: fileFilterByPath })


// enable CORS
app.use(cors());

// add other middleware
app.use(bodyParser.json());

app.use(express.json());
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.post('/api/single', async (req, res) => {
    try {
        const avatar = req.file;
        // make sure file is available
        if (!avatar) {
            res.status(200).send({
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

app.post('/api/multi_upload', upload.array('scanFile', 12), async (req, res) => {
    try {
        // console.log(req,"req.body");
        // console.log(req.body,"req.params");
        const photos = req.files;
        console.log(photos, "photos");
        // check if photos are available
        if (photos.length == 0) {
            res.status(200).send({
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
            res.status(200).send({
                status: true,
                message: 'Scan Files are uploaded.',
                data: data
            });
        }

    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/api/multi_uploadByPath', uploadByPath.array('scanFile', 12), async (req, res) => {
    const sourcePath = req.body.scanFile[0]?.replace(/\\\\/g, '\\');
    const destinationPath = req.body.scanFile[1]?.replace(/\\\\/g, '\\');;
    const isConfirm = req.body.scanFile[2]
    console.log(sourcePath, "sourcePath");
    console.log(destinationPath, "destinationPath");
    console.log(isConfirm, "isConfirm");
    // res.status(200).json({
    //     message:"test",
    //     data:{
    //         sourcePath:sourcePath,
    //         destinationPath:destinationPath
    //     }
    // })
    // return
    if (!sourcePath || !destinationPath) {
        return res.status(200).json({ message: 'Both sourcePath and destinationPath are required',status:false });
    }

    // Check if the source file exists
    if (!fs.existsSync(sourcePath)) {
        return res.status(200).json({ message: 'Source file not found' ,status:false});
    }

    const newFileName = path.basename(destinationPath);
    const newDesPath = path.dirname(destinationPath)
    console.log(newFileName, "newFileName");
    console.log(newDesPath, "newFileName");

    // Create the new destination path with the new file name
    const newFilePath = path.join(newDesPath, newFileName);
    console.log(newFilePath, "newFilePath");

    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(newDesPath)) {
        fs.mkdirSync(newDesPath, { recursive: true });
    }

    // Check if the destination file already exists
    if (fs.existsSync(newFilePath)) {
        // Delete the existing destination file
        console.log("File is exists");
        // fs.unlinkSync(newFilePath);
        // const existsFile = await readFileExists(newFilePath);
        if (isConfirm == "1") {
            console.log(isConfirm, "isConfirm if");
            fs.unlinkSync(newFilePath);
        } else {
            console.log(isConfirm, "isConfirm else");
            return await fs.readFile(newFilePath, (err, data) => {
                console.log("========= readFileExists ===========");
                try {
                    const fileAsBase64 = data.toString('base64');
                    // console.log(fileAsBase64,"readFileExists");
                    // return fileAsBase64;
                    return res.status(200).json({ status: false, message: 'มีไฟล์ปลายทางอยู่ก่อนแล้ว', file: fileAsBase64, path: newFilePath });
                } catch (err) {
                    return err
                }
            });
        }
        // console.log(existsFile,"existsFile");

    }

    // Copy and rename the file
    fs.copyFileSync(sourcePath, newFilePath);

    res.status(200).send(
        {
            status: true,
            message: 'อัปโหลดไฟล์สำเร็จ',
            data: {
                sourcePath: sourcePath,
                destinationPath: destinationPath
            }
        }
    );
});

app.post('/api/uploadFileCiraCore', uploadCiraCore.array('scanFile', 12), async (req, res) => {
    try {
        const directory = req.body.scanFile[0];
        const filename = req.body.scanFile[1];
        const photos = req.files;
        console.log(directory, "directory uploadFileCiraCore");
        console.log(filename, "filename uploadFileCiraCore");
        if (photos.length == 0) {
            res.status(200).send({
                status: false,
                data: 'ไม่พบไฟล์ที่เลือก'
            });
        } else {
            let data = [];
            photos.map(p =>
                data.push({
                    name: p.originalname,
                    mimetype: p.mimetype,
                    size: p.size
                }));
            res.status(200).send({
                status: true,
                message: 'อัปโหลดไฟล์สำเร็จ',
                path: directory,
                filename: filename
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }

})

app.get('/api/file', async (req, res) => {
    const filePath = req.query.filePath;
    console.log(filePath, "test");
    await fs.readFile(`S:${filePath}`,async (err, data) => {
        try {
            if (err) {
                res.status(200).send({
                    status: false,
                    error: 'Failed to read file' + err,
                    path: `S:${filePath}`
                });
                return;
            }
            let desiredData = await sharp(data).jpeg({quality: 15}).rotate().toBuffer();
            const fileAsBase64 = desiredData.toString('base64');
            res.status(200).send({
                status: true,
                fileAsBase64: fileAsBase64
            });
        } catch (error) {
            res.status(500).send(error);
        }
    });
});

app.get('/api/fileByPath', (req, res) => {
    const filePath = req.query.filePath;
    console.log(filePath, "test");
    fs.readFile(`${filePath}`, async (err, data) => {
        try {
            if (err) {
                res.status(200).send({
                    status: false,
                    error: 'Failed to read file' + err,
                    path: `${filePath}`
                });
                return;
            }

            let desiredData = await sharp(data).jpeg({quality: 15}).rotate().toBuffer();
            const fileAsBase64 = desiredData.toString('base64');

            res.status(200).send({
                path: `${filePath}`,
                status: true,
                fileAsBase64: fileAsBase64,
            });
        } catch (error) {
            res.status(200).send({
                status: false,
                error: error,
                path: `${filePath}`
            });
        }
    });
});

app.post('/api/deleteFile', (req, res) => {
    let filePath = req.body
    console.log(filePath.FILE_PATH, "filePath");
    if (filePath.FILE_PATH == undefined) {
        res.status(400).send({
            MSG: "Require target path file.",
            STATUS: false
        });
    } else {
        try {
            if (fs.existsSync(filePath.FILE_PATH)) {
                fs.unlinkSync(filePath.FILE_PATH);
                res.status(200).send({
                    MSG: "Delete file success",
                    FILE_PATH: filePath.FILE_PATH,
                    STATUS: true
                });
            } else {
                res.status(200).send({
                    MSG: "Target file not found",
                    FILE_PATH: filePath.FILE_PATH,
                    STATUS: false
                });
            }
        } catch (error) {
            res.status(200).send({
                error: error,
                FILE_PATH: filePath,
                STATUS: false
            });
        }
    }

})

app.post('/uploadTwain', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        console.log(util.inspect({
            fields: fields,
            files: files
        }));
        console.log("RemoteFile: ",files.RemoteFile[0].originalFilename);
        console.log("__dirname",__dirname);
        fs.readFile(files.RemoteFile[0].filepath, function (err, data) {
            // save file from temp dir to new dir
            var newPath = __dirname + "/uploaded/" + files.RemoteFile[0].originalFilename;
            fs.writeFile(newPath, data, function (err) {
                if (err) throw err;
                console.log('file saved');
                res.end();
            });
        });
    });
})

app.get('/', async (req, res) => {
    res.status(200).send("1.00001");
});

app.listen(8100, () => {
    console.log('Server is running on port 8100');
});