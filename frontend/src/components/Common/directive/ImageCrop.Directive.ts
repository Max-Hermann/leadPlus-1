/// <reference path="../../app/App.Common.ts" />
/// <reference path="../../FileUpload/model/FileUpload.Model.ts" />

angular.module(moduleApp)
    .directive("imagecrop", function ($rootScope) {
        let directive: { restrict: string, scope: any, templateUrl: any, transclude: boolean, link: any };
        directive = { restrict: null, scope: null, templateUrl: null, transclude: null, link: null };
        directive.scope = {
            event: "@",
            defaultpicture: "=",
            quality: "@",
            savebutton: "@"
        };
        directive.restrict = "A";
        directive.templateUrl = function (elem, attr) {
            return "components/Common/view/ImageCrop.html";
        };
        directive.transclude = true;
        directive.link = function (scope, element, attrs) {
            $("#errorMessage").hide();
            scope.hideErrorMessage = function () {
                $("#errorMessage").hide();
            };
            scope.buildImageCropper = function () {
                let $image = $(".image-crop > img") as any;
                $image.cropper({
                    aspectRatio: 1,
                    preview: ".img-preview"
                });

                let $inputImage = $("#inputImage");
                if (window["FileReader"]) {
                    $inputImage.change(function () {
                        let fileReader = new FileReader(),
                            files = this.files,
                            file;

                        if (!files.length) {
                            return;
                        }

                        file = files[0];
                        scope.currentFileSize = file.size;
                        if (file.size > 1024 * 1024 * 4) {
                            $("#errorMessage").show();
                            return;
                        } else {
                            $("#errorMessage").hide();
                        }
                        if (/^image\/\w+$/.test(file.type)) {

                            fileReader.readAsDataURL(file);
                            fileReader.onload = function () {
                                $inputImage.val("");
                                $image.cropper("reset", true).cropper("replace", this.result);
                            };
                        }
                    });
                } else {
                    $inputImage.addClass("hide");
                }
            };
            scope.buildImageCropper();
            scope.save = function () {
                let qualityArray: Array<number> = scope.quality.split(",");
                let result: Array<FileUpload> = [];
                for (let i = 0; i < qualityArray.length; i++) {
                    let quality = Number(qualityArray[i]);
                    if (isNullOrUndefined(quality) || isNaN(quality) || quality <= 0 || quality > 100) {
                        $rootScope.$broadcast(scope.event, undefined);
                        return;
                    }
                    let $image = $(".image-crop > img") as any;
                    let canvas = $image.cropper("getCroppedCanvas");
                    if (isNullOrUndefined(canvas.toDataURL)) {
                        $rootScope.$broadcast(scope.event, undefined);
                        return;
                    }
                    let picture = new FileUpload();
                    picture.mimeType = "image/jpeg";
                    picture.filename = "profilepicture";
                    picture.content = canvas.toDataURL("image/jpeg", quality / 100).split(",")[1];
                    picture.size = Math.round((picture.content.length) * 3 / 4);
                    result.push(picture);
                }
                $rootScope.$broadcast(scope.event, result);
            };

            scope.buildImageCropper();

            scope.$on("saveCroppedImage", function (evt, data) {
                scope.save(data);
            });

        };
        return directive;
    });