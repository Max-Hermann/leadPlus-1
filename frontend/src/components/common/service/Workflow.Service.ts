/// <reference path="../../Product/model/Product.Model.ts" />
/// <reference path="../../User/model/User.Model.ts" />
/// <reference path="../../app/App.Constants.ts" />
/// <reference path="../../app/App.Resource.ts" />
/// <reference path="../../Product/controller/Product.Service.ts" />
/// <reference path="../../common/model/OrderPosition.Model.ts" />
/*******************************************************************************
 * Copyright (c) 2016 Eviarc GmbH. All rights reserved.
 * 
 * NOTICE: All information contained herein is, and remains the property of
 * Eviarc GmbH and its suppliers, if any. The intellectual and technical
 * concepts contained herein are proprietary to Eviarc GmbH, and are protected
 * by trade secret or copyright law. Dissemination of this information or
 * reproduction of this material is strictly forbidden unless prior written
 * permission is obtained from Eviarc GmbH.
 ******************************************************************************/
"use strict";

const WorkflowServiceId: string = "WorkflowService";

class WorkflowService {

    private $inject = [commentResourceId, ProcessResourceId, $filterId, toasterId, $rootScopeId, $translateId, ProductServiceId];

    commentResource;
    processResource;
    filter;
    toaster;
    rootScope;
    translate;
    productService: ProductService;

    constructor(CommentResource, ProcessResource, $filter, toaster, $rootScope, $translate, ProductService) {
        this.commentResource = CommentResource.resource;
        this.processResource = ProcessResource.resource;
        this.filter = $filter;
        this.toaster = toaster;
        this.rootScope = $rootScope;
        this.translate = $translate;
        this.productService = ProductService;
    }

    addComment(id, source, process, user, comments, commentInput, commentModalInput) {
        let self = this;
        let commentText = "";
        if (angular.isUndefined(comments[id])) {
            comments[id] = [];
        }
        if (source === "table" && commentInput[id] !== ""
            && !angular.isUndefined(commentInput[id])) {
            commentText = commentInput[id];
        } else if (source === "modal" && commentModalInput[id] !== ""
            && !angular.isUndefined(commentModalInput[id])) {
            commentText = commentModalInput[id];
        }

        let comment = {
            process: process,
            creator: user,
            commentText: commentText,
            timestamp: this.filter("date")(new Date(), "dd.MM.yyyy HH:mm:ss")
        };
        this.commentResource.save(comment).$promise.then(function () {
            comments[id].push(comment);
            commentInput[id] = "";
            commentModalInput[id] = "";
        });
    }
    addProduct(array, currentProductId, currentProductAmount) {
        if (!isNaN(Number(currentProductId))
            && Number(currentProductId) > 0) {
            let tempProduct = findElementById(this.productService.products,
                Number(currentProductId));
            let tempOrderPosition = new OrderPosition();
            tempOrderPosition.product = tempProduct as Product;
            tempOrderPosition.amount = currentProductAmount;
            array.push(tempOrderPosition);
        }
    }
    deleteProduct(array, index) {
        array.splice(index, 1);
    }
    sumOrderPositions(array) {
        let sum = 0;
        if (isNullOrUndefined(array)) {
            return 0;
        }
        for (let i = 0; i < array.length; i++) {
            let temp = array[i];
            if (!isNullOrUndefined(temp) && !isNaN(temp.amount)
                && !isNullOrUndefined(temp.product)
                && !isNaN(temp.product.priceNetto)) {
                sum += temp.amount * temp.product.priceNetto;
            }
        }
        return sum;
    }

    addLeadToOffer(process: Process, user: User): any {
        let self = this;
        let offer: Offer = {
            id: 0,
            container: {
                name: "",
                description: "",
                priceNetto: 0
            },
            orderPositions: deepCopy(process.lead.orderPositions),
            containerAmount: process.lead.containerAmount,
            deliveryAddress: process.lead.deliveryAddress,
            deliveryDate: null,
            offerPrice: self.sumOrderPositions(process.lead.orderPositions),
            customer: process.lead.customer,
            timestamp: moment.utc().format("DD.MM.YYYY HH:mm"),
            vendor: process.lead.vendor
        };
        for (let i = 0; i < offer.orderPositions.length; i++) {
            offer.orderPositions[i].id = 0;
        }
        this.processResource.createOffer({
            id: process.id
        }, offer).$promise.then(function () {
            self.processResource.setStatus({
                id: process.id
            }, "OFFER").$promise.then(function () {
                self.toaster.pop("success", "", self.translate
                    .instant("COMMON_TOAST_SUCCESS_NEW_OFFER"));
                self.rootScope.leadsCount -= 1;
                self.rootScope.offersCount += 1;
                if (process.processor === null) {
                    self.processResource.setProcessor({
                        id: process.id
                    }, user.id).$promise.then(function () {
                        process.processor = user;
                    });
                }
                process.offer = offer;
                process.status = "OFFER";
            });
        });
    }
}
angular.module(moduleWorkflowService, [ngResourceId]).service(WorkflowServiceId, WorkflowService);