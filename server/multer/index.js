import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Storage
const storage = new Storage({
    projectId: 'boutaleb-82980',
    credentials: {
        client_email: 'firebase-adminsdk-voyst@boutaleb-82980.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCTB64HOoxjV4Qn\npqYwkkNTObRZmhS/fLgiSxxo7Vdk7gM9n55DcbB/V/mu2135tcxx2V6FlfCaVVga\nIWKCPHucVa6bnol09jQMApn16MAEdde/7wC2YUNvYstSw7aDdjnm0Qs+77BlGBqc\nCv+UJA+mZQ1h9k814fHmQzP3XjxJWTAXH1yUUoaGLx5AXdXCgj++ntehL/qairP8\nJyAPX0onQr8rq/urDAeoZQYddPDm+HxpzH2XDUCk9S7A9XIiuL+0AV9fCJMg3fpg\nsCBWl3AL6g377VEFbt+4Id53WJCjbVHziOrMtEIFS8EKhGJqcZuRSOlMKn+06uvW\nwmdDRo3rAgMBAAECggEAFNMxJIf363gxWTZi8p082PRi5ZAL4UVmhUDzQK9hQgPu\nRJOvpGjdcWQCEvCyQlSsJPH/T9d5cTqmVGknHUA4199Q8GzHll/q5kqWCP0S+W7B\nhMdy5+Il3Yh2OP5MgxlDQTyZpavoZaFA35o1MgPbjZthhl8PQBgFHbKmESLxUggP\ncCBJjaKob4y7qGKApUiT6yz2khkw3QL9W4tz/UQvjK4eoOt+f0Pqz0/XH/jTGxHd\nedRIr4hj/8TDseoIRNmNU2sBhO7EH2pUDPz7XjWDtZGbMcbESbEIrKcwrbRyDJNe\nGQRx7ahRYaKE06gjm4DW/ZWyPRjuJbcC4E/Js5xU8QKBgQDDx61u03PkxhKEu3Ge\nFsB0rdxSo05OJIYuFsoWHIcrKq+2p5dqm0ETzhw8UMHhwh448T/vw8hQdoO5g1DL\nVaRXs+DxlR3PJ+CKIwI0gcqyYbjF8iAiy2WMM+8ESgS1tv08yKbQfA77U7f9bAcs\naYnSBxfpm6wlJixabs2jAyAgmwKBgQDAQUbxN3djg2DrnjVCTvZIqoBBM45xJbLT\nEv9r+KiUjwNTVgjAXa14APysL2fAzzGXKsiULGbb9jdyb8ZuNnMJuShG2WUI1PIl\nV4+oUCmyiNPINsGG2i1xwFoIVUIZ6bW23XRh0u9L6EhPRe9BdWZOGWqoNxnWDSW5\nUUSe3s9U8QKBgAo+V1e2Hpk4t91UBWTVIeq48g8s1jsGdDLTJG21vmjGyfzPlf+Q\n8f28SgPp4csTIguuq766yq9TFB9PvJl2+KtSERHy0GV3W6s+m63toJJmxIku2vmX\nFNAaI4Zg7RAo6+UTRo8f/pSt07GhxlpPh1OC5YBmkcI71hRBOecuka7DAoGAPVuX\n/JwrKkNfx1LyxHrW91ITJLwDlfDmJZ9GjXsKsn8CHLK0kFBVcJtACOQIROzbctdg\ntImHOmRWRduOhNYz2MKTLCltqWfs8CYF3z3WUPiCPr/a++Ld5hPxp/8t3X9NU1NS\nNXZQkPVNPp+fQFDrmbla5NzRDhOcGozpTZrmqMECgYEAtVfHPxdub2EoaYW4fuc1\nCiMrjyphebKCAbf52Esf8Kp7uITH+E0AeZigbJAHeRg3kWZ5vvxXt/1/dQ5B21iN\n3g5yQB/zlMUS3fKGAvDebBotdeArxACr7WU6vq5Mdc3FhF5P75d3Zz7dyGTVm2h9\n0/6J9XyaI4f+mAX89pMHYBk=\n-----END PRIVATE KEY-----\n',
    },
});

// Set up a bucket reference
const bucket = storage.bucket('boutaleb-82980.appspot.com');

// Function to handle image upload
const uploadImage = (req, res, next) => {
    const multerUpload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit (adjust as needed)
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed.'));
            }
        },
    }).single('_user_picture');

    multerUpload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        // Skip further execution if no file is uploaded (no picture provided)
        if (!req.file) {
            return next();
        }

        // Proceed to the next middleware after image upload
        next();
    });
};

// Function to upload image to Firebase Storage
const uploadToStorage = async (req, res, next) => {
    if (!req.file) {
        // Skip further execution if no file is uploaded (no picture provided)
        return next();
    }

    const file = req.file;
    const fileName = `${uuidv4()}-${Date.now()}-${path.basename(file.originalname)}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.mimetype,
        },
        public: true, // Make the file public so it can be accessed via a URL
    });

    blobStream.on('error', (err) => {
        return res.status(500).json({ message: 'Error uploading image' });
    });

    blobStream.on('finish', () => {
        // Add the public URL of the uploaded image to the request object
        req.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(
            blob.name
        )}?alt=media`;

        next();
    });

    blobStream.end(file.buffer);
};

export default [uploadImage, uploadToStorage];