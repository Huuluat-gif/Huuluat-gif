import { HttpError } from './api';
import { isIsolatedPreviewEnv } from './env';
/** Preview / staging must never fall back to the connected production store. */
export function blobToken(){
 const preview=isIsolatedPreviewEnv();
 const token=preview?process.env.LOWF_PREVIEW_READ_WRITE_TOKEN:process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)throw new HttpError(503,preview?'Kho tệp Preview riêng chưa được cấu hình.':'Kho tệp chưa được cấu hình.');
 return token;
}
export function blobCredentials(){return{token:blobToken()};}
