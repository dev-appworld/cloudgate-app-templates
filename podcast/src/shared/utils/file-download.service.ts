import { Injectable } from '@angular/core';

export interface FileDto {
  fileName?: string;
  fileType?: string;
  fileToken?: string;
}

@Injectable()
export class FileDownloadService {
  /** Legacy ABP temp-file download — not available without remoteServiceBaseUrl. */
  downloadTempFile(_file: FileDto) {
    abp.notify.warn('File download is not available in this template.');
  }
}
