import { Injectable } from '@angular/core';
import { AppConsts } from 'src/app/shared/AppConsts';
import { FileDto } from '../service-proxies/service-proxies';

@Injectable()
export class FileDownloadService {
  downloadTempFile(file: FileDto) {
    const url =
      AppConsts.remoteServiceBaseUrl +
      '/File/DownloadTempFile?fileType=' +
      file.fileType +
      '&fileToken=' +
      file.fileToken +
      '&fileName=' +
      file.fileName;
    location.href = url; //TODO: This causes reloading of same page in Firefox
  }
}
