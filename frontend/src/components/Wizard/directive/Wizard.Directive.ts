/// <reference path="../../app/App.Constants.ts" />
/// <reference path="../../app/App.Constants.ts" />
/// <reference path="../../Workflow/controller/Workflow.Service.ts" />
/// <reference path="../../Wizard/model/WizardButtonConfig.Model.ts" />
/// <reference path="../../Common/directive/Directive.Interface.ts" />
/// <reference path="../../Process/controller/Process.Service.ts" />
/// <reference path="../../../typeDefinitions/angular.d.ts" />

const WizardDirectiveId: string = "wizard";

class WizardDirective implements IDirective {
    templateUrl = () => { return "components/Wizard/view/Wizard.html"; };
    transclude = {
        "customerEdit": "?customerEdit",
        "productEdit": "?productEdit",
        "customerProductEdit": "?customerProductEdit",
        "emailEdit": "?emailEdit",
        "saleEdit": "?saleEdit"
    };

    restrict = "E";
    scope = {
        modalTitle: "@",
        editProcess: "=",
        editWorkflowUnit: "=",
        modalInstance: "=",
        wizardConfig: "=",
        currentNotification: "=",
        transform: "<",
        inconsistency: "="
    };

    constructor(private WorkflowService: WorkflowService, private CustomerService: CustomerService, private ProcessService: ProcessService, private FileService: FileService, private NotificationService: NotificationService, private $rootScope, private $translate, private toaster) {
    }

    static directiveFactory(): WizardDirective {
        let directive: any = (WorkflowService: WorkflowService, CustomerService: CustomerService, ProcessService: ProcessService, FileService: FileService, NotificationService: NotificationService, $rootScope, $translate, toaster) => new WizardDirective(WorkflowService, CustomerService, ProcessService, FileService, NotificationService, $rootScope, $translate, toaster);
        directive.$inject = [WorkflowServiceId, CustomerServiceId, ProcessServiceId, FileServiceId, NotificationServiceId, $rootScopeId, $translateId, toasterId];
        return directive;
    }

    link(scope, element, attrs, ctrl, transclude): void {
        scope.workflowService = this.WorkflowService;
        scope.customerService = this.CustomerService;
        scope.processService = this.ProcessService;
        scope.translate = this.$translate;
        scope.toaster = this.toaster;
        scope.fileService = this.FileService;
        scope.notificationService = this.NotificationService;
        scope.rootScope = this.$rootScope;
        scope.wizardElements = new Array<WizardButtonConfig>();
        scope.step = 1;
        scope.currentWizard;
        scope.disableSendingButton = false;

        scope.back = () => this.back(scope);
        scope.continue = () => this.continue(scope);
        scope.allowToContinue = () => this.allowToContinue(scope);
        scope.close = (result: boolean, process: Process) => this.close(result, process, scope);
        scope.closeAndRefresh = () => this.closeAndRefresh(scope);
        scope.transformWorkflow = () => this.transformWorkflow(scope);
        scope.save = () => this.save(scope);
        scope.saveOrTransform = () => this.saveOrTransform(scope);
        scope.send = () => this.send(scope);
        scope.isAnyFormInvalid = () => this.isAnyFormInvalid(scope);
        scope.getNotificationType = () => this.getNotificationType(scope);
        scope.followUp = () => this.followUp(scope);
        scope.isLead = () => this.isLead(scope);
        scope.isOffer = () => this.isOffer(scope);
        scope.isSale = () => this.isSale(scope);
        scope.isInOfferTransformation = () => this.isInOfferTransformation(scope);
        scope.isInSaleTransformation = () => this.isInSaleTransformation(scope);
        scope.getWizardConfigByTransclusion = (wizardConfig: Array<WizardButtonConfig>, transclusion: any) => this.getWizardConfigByTransclusion(wizardConfig, transclusion);
        let wizardConfig: Array<WizardButtonConfig> = scope.wizardConfig;
        let firstActiveElement = null;

        for (let transclusion in this.transclude) {
            transclude(function (content) {
                let wizardButtonConfig: WizardButtonConfig = scope.getWizardConfigByTransclusion(wizardConfig, transclusion);
                if (!isNullOrUndefined(wizardButtonConfig)) {
                    scope.wizardElements.push(wizardButtonConfig);
                    if (wizardButtonConfig.isFirstActiveElement) {
                        firstActiveElement = wizardButtonConfig;
                        scope.step = scope.wizardElements.indexOf(wizardButtonConfig) + 1;
                    }
                }

            }, null, transclusion);
        }
        isNullOrUndefined(firstActiveElement) ? scope.currentWizard = scope.wizardElements[0] : scope.currentWizard = firstActiveElement;
        scope.currentWizard.visit();

        if (!isNullOrUndefined(scope.currentNotification) && !isNullOrUndefined(scope.currentNotification.id)) {
            scope.currentNotification.notificationType = scope.getNotificationType();
            return;
        } else if (!isNullOrUndefined(scope.currentNotification)) {
            scope.currentNotification.recipients = scope.editWorkflowUnit.customer.email;
            scope.$watch("editWorkflowUnit.customer.email", function (newValue, oldValue) {
                if (newValue !== oldValue && !isNullOrUndefined(scope.editWorkflowUnit)) {
                    scope.currentNotification.recipients = scope.editWorkflowUnit.customer.email;
                }
            }, true);
            scope.currentNotification.notificationType = scope.getNotificationType();
        }
    };

    back(scope: any) {
        if (scope.step > 1) {
            let wizardELement = this.getWizardByPosition(scope.step - 1, scope.wizardElements);
            if (wizardELement !== null && !wizardELement.isDisabled && wizardELement.isVisible) {
                scope.step -= 1;
                wizardELement.visit();
                scope.currentWizard = this.getWizardByPosition(scope.step, scope.wizardElements);
            }
        }
    }

    continue(scope: any) {
        let wizardELement = this.getWizardByPosition(scope.step + 1, scope.wizardElements);
        if (wizardELement !== null && !wizardELement.isDisabled && wizardELement.isVisible) {
            scope.step += 1;
            wizardELement.visit();
            scope.currentWizard = wizardELement;
        }
    }

    getWizardByPosition(position: number, wizardElements: Array<WizardButtonConfig>): WizardButtonConfig {
        for (let wizardElement of wizardElements) {
            if (wizardElement.position === position) {
                return wizardElement;
            }
        }
        return null;
    }

    allowToContinue(scope: any) {
        let wizardELement = this.getWizardByPosition(scope.step + 1, scope.wizardElements);
        return wizardELement !== null && !wizardELement.isDisabled && wizardELement.isVisible;
    }

    getWizardConfigByTransclusion(wizardConfig: Array<WizardButtonConfig>, transclusion: any): WizardButtonConfig {
        for (let buttonConfig of wizardConfig) {
            if (buttonConfig.directiveType === transclusion) {
                return buttonConfig;
            }
        }
        return null;
    }

    close(result: boolean, process: Process, scope: any) {
        scope.modalInstance.close(process);
        if (!result && scope.isLead()) {
            scope.editProcess.offer = undefined;
        } else if (!result && scope.isOffer()) {
            scope.editProcess.sale = undefined;
        }
    }

    saveOrTransform(scope: any) {
        if (scope.transform) {
            scope.transformWorkflow();
        } else {
            scope.save();
        }
    }

    async transformWorkflow(scope: any) {
        let process = scope.editProcess;
        let resultProcess = null;
        try {
            if (scope.isLead()) {
                resultProcess = await scope.workflowService.addLeadToOffer(process);
            } else if (scope.isOffer()) {
                resultProcess = await scope.workflowService.addOfferToSale(process);
            }
            scope.inconsistency = null;
            scope.close(true, resultProcess);
        } catch (error) {
            scope.inconsistency = showConsistencyErrorMessage(error, scope.translate, scope.toaster, "PROCESS_PROCESS");
            throw error;
        }
    }

    async save(scope: any): Promise<Process> {
        let isNewProcess: boolean = isNullOrUndefined(scope.editProcess.id);
        try {
            let resultProcess = await scope.processService.save(scope.editProcess, scope.editWorkflowUnit, !isNewProcess, false) as Process;
            scope.inconsistency = null;
            scope.close(true, resultProcess);
            return resultProcess;
        } catch (error) {
            scope.inconsistency = showConsistencyErrorMessage(error, scope.translate, scope.toaster, "PROCESS_PROCESS");
            throw error;
        }
    }

    closeAndRefresh(scope) {
        scope.close(true, undefined);
        scope.rootScope.$broadcast(broadcastRefreshDatatable);
        scope.rootScope.$broadcast(broadcastRefreshDashboard);
    }

    getNotificationType(scope: any): NotificationType {
        if (scope.transform && scope.isInOfferTransformation()) {
            return NotificationType.OFFER;
        } else if (scope.transform && scope.isInSaleTransformation()) {
            return NotificationType.SALE;
        } else if (!scope.transform && scope.isLead()) {
            return NotificationType.LEAD;
        } else if (!scope.transform && scope.isOffer() && !scope.currentWizard.isFollowUp) {
            return NotificationType.OFFER;
        } else if (!scope.transform && scope.isOffer() && scope.currentWizard.isFollowUp) {
            return NotificationType.FOLLOWUP;
        } else if (!scope.transform && scope.isSale()) {
            return NotificationType.SALE;
        }
    }

    async send(scope: any) {
        scope.disableSendingButton = true;
        let notificationType: NotificationType = scope.getNotificationType();
        let process: Process = scope.editProcess;
        process.notifications = process.notifications ? process.notifications : [];

        let notification: EmailNotification = deepCopy(scope.currentNotification);
        notification.attachments = notification.attachments ? notification.attachments : [];
        notification.notificationType = notificationType;
        notification.id = undefined;
        let deleteRow = false;

        try {
            if (scope.isInOfferTransformation()) {
                deleteRow = true;
                process = await scope.workflowService.addLeadToOffer(process);
            } else if (scope.isInSaleTransformation()) {
                deleteRow = true;
                process = await scope.workflowService.addOfferToSale(process);
            }
            scope.inconsistency = null;
        } catch (error) {
            scope.inconsistency = showConsistencyErrorMessage(error, scope.translate, scope.toaster, "PROCESS_PROCESS");
            throw error;
        }

        if (notificationType === NotificationType.FOLLOWUP) {
            if (process.status !== Status.FOLLOWUP && process.status !== Status.DONE) {
                process.status = Status.FOLLOWUP;
            }
        } else if (notificationType === NotificationType.LEAD) {
            if (process.status !== Status.INCONTACT) {
                process.status = Status.INCONTACT;
            }
        }

        let resultProcess;
        try {
            resultProcess = await scope.processService.save(process, scope.editWorkflowUnit, !deleteRow, deleteRow) as Process;
            scope.inconsistency = null;
        } catch (error) {
            scope.inconsistency = showConsistencyErrorMessage(error, scope.translate, scope.toaster, "PROCESS_PROCESS");
            throw error;
        }

        scope.$broadcast(broadcastSetNotificationSendState, NotificationSendState.SENDING);
        scope.close(true, resultProcess);

        let promises: Array<Promise<void>> = notification.attachments ?
            notification.attachments
                .filter(a => isNullOrUndefined(a.id))
                .map(a => scope.fileService.saveAttachment(a)) : [];
        for (let p of promises) {
            await p;
        }
        notification.attachments.forEach(a => a.id = undefined);

        try {
            notification.timestamp = newTimestamp();
            let resultNotification = await scope.notificationService.sendNotification(notification, process);
            resultProcess.notifications.push(resultNotification);
            resultProcess.followUpAmount++;
        } catch (error) {
            let savedProcess: Process = await scope.processService.getById(process.id);
            let tempNotifications = savedProcess.notifications.filter(n => n.timestamp === notification.timestamp);
            if (tempNotifications.length !== 1) {
                throw Error("Inconsistent Client Data");
            }
            resultProcess.notifications.push(tempNotifications[0]);

        }
    }

    async followUp(scope) {
        if (scope.editProcess.status !== Status.FOLLOWUP && scope.editProcess.status !== Status.DONE) {
            try {
                let resultProcess = await scope.processService.setStatus(scope.editProcess, Status.FOLLOWUP) as Process;
                scope.rootScope.$broadcast(broadcastUpdate, resultProcess);
                scope.inconsistency = null;
                scope.close(true, resultProcess);
            } catch (error) {
                scope.inconsistency = showConsistencyErrorMessage(error, scope.translate, scope.toaster, "PROCESS_PROCESS");
                throw error;
            }
        } else {
            scope.close(true);
        }
    }

    isLead(scope: any): boolean {
        return scope.workflowService.isLead(scope.editProcess);
    }

    isOffer(scope: any): boolean {
        return scope.workflowService.isOffer(scope.editProcess);
    }

    isSale(scope: any): boolean {
        return scope.workflowService.isSale(scope.editProcess);
    }

    isInOfferTransformation(scope: any): boolean {
        return scope.isLead() && !isNullOrUndefined(scope.editProcess.offer);
    }

    isInSaleTransformation(scope: any): boolean {
        return scope.isOffer() && !isNullOrUndefined(scope.editProcess.sale);
    }

    isAnyFormInvalid(scope: any): boolean {
        for (let buttonConfig of scope.wizardElements) {
            if (!isNullOrUndefined(buttonConfig.form) && buttonConfig.form.$invalid && buttonConfig.validation) {
                return true;
            }
        }
        return false;
    }

}
angular.module(moduleApp).directive(WizardDirectiveId, WizardDirective.directiveFactory());

