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

'use strict';
angular.module('app.leads', [ 'ngResource' ])
		.controller('LeadsCtrl', LeadsCtrl);
LeadsCtrl.$inject = [ 'DTOptionsBuilder', 'DTColumnBuilder', '$compile',
		'$scope', 'toaster', 'ProcessResource', 'CommentResource', '$filter',
		'UserResource', '$rootScope', '$translate', 'LeadResource' ];
function LeadsCtrl(DTOptionsBuilder, DTColumnBuilder, $compile, $scope,
		toaster, ProcessResource, CommentResource, $filter, UserResource,
		$rootScope, $translate, LeadResource) {
	var vm = this;
	this.filter = $filter;
	this.processResource = ProcessResource;
	this.commentResource = CommentResource;
	this.userResource = UserResource;
	this.leadResource = LeadResource;
	this.user = {};
	this.windowWidth = $(window).width();
	if (!angular.isUndefined($rootScope.globals.currentUser))
		this.userResource.get({
			id : $rootScope.globals.currentUser.id
		}).$promise.then(function(result) {
			vm.user = result;
		});
	this.scope = $scope;
	this.rootScope = $rootScope;
	this.translate = $translate;
	this.compile = $compile;
	this.toaster = toaster;
	this.commentInput = {};
	this.commentModalInput = {};
	this.comments = {};
	this.currentCommentModalId = '';
	this.loadAllData = false;
	this.dtInstance = {};
	this.processes = {};
	this.rows = {};
	this.editProcess = {};
	this.newLead = {};
	this.dtOptions = DTOptionsBuilder.newOptions().withOption('ajax', {
		url : '/api/rest/processes/workflow/LEAD/state/OPEN',
		error : function(xhr, error, thrown) {
			console.log(xhr);
		},
		type : 'GET'
	}).withOption('stateSave', true).withDOM(
			'<"row"<"col-sm-12"l>>' + '<"row"<"col-sm-6"B><"col-sm-6"f>>'
					+ '<"row"<"col-sm-12"tr>>'
					+ '<"row"<"col-sm-5"i><"col-sm-7"p>>').withPaginationType(
			'full_numbers').withButtons([ {
		extend : 'copyHtml5',
		exportOptions : {
			columns : [ 6, 1, 2, 3, 5, 7, 9, 10, 11, 8, 12 ],
			modifier : {
				page : 'current'
			}
		}
	}, {
		extend : 'print',
		exportOptions : {
			columns : [ 6, 1, 2, 3, 5, 7, 9, 10, 11, 8, 12 ],
			modifier : {
				page : 'current'
			}
		}
	}, {
		extend : 'csvHtml5',
		title : $translate('LEAD_LEADS'),
		exportOptions : {
			columns : [ 6, 1, 2, 3, 5, 7, 9, 10, 11, 8, 12 ],
			modifier : {
				page : 'current'
			}

		}
	}, {
		extend : 'excelHtml5',
		title : $translate.instant('LEAD_LEADS'),
		exportOptions : {
			columns : [ 6, 1, 2, 3, 5, 7, 9, 10, 11, 8, 12 ],
			modifier : {
				page : 'current'
			}
		}
	}, {
		extend : 'pdfHtml5',
		title : $translate('LEAD_LEADS'),
		orientation : 'landscape',
		exportOptions : {
			columns : [ 6, 1, 2, 3, 5, 7, 9, 10, 11, 8, 12 ],
			modifier : {
				page : 'current'
			}
		}
	} ]).withBootstrap().withOption('createdRow', createdRow).withOption(
			'order', [ 4, 'desc' ]);
	this.dtColumns = [
			DTColumnBuilder.newColumn(null).withTitle('').notSortable()
					.renderWith(addDetailButton),
			DTColumnBuilder.newColumn('lead.inquirer.lastname').withTitle(
					$translate('COMMON_NAME')).withClass('text-center'),
			DTColumnBuilder.newColumn('lead.inquirer.company').withTitle(
					$translate('COMMON_COMPANY')).withClass('text-center'),
			DTColumnBuilder.newColumn('lead.inquirer.email').withTitle(
					$translate('COMMON_EMAIL')).withClass('text-center'),
			DTColumnBuilder.newColumn('lead.timestamp').withTitle(
					$translate('COMMON_DATE')).withOption('type', 'date-euro')
					.withClass('text-center'),
			DTColumnBuilder.newColumn('lead.inquirer.phone').withTitle(
					$translate('COMMON_PHONE')).notVisible(),
			DTColumnBuilder.newColumn('lead.inquirer.firstname').withTitle(
					$translate('COMMON_FIRSTNAME')).notVisible(),
			DTColumnBuilder.newColumn('lead.container.name').withTitle(
					$translate('COMMON_CONTAINER')).notVisible(),
			DTColumnBuilder.newColumn('lead.destination').withTitle(
					$translate('COMMON_CONTAINER_DESTINATION')).notVisible(),
			DTColumnBuilder.newColumn('lead.containerAmount').withTitle(
					$translate('COMMON_CONTAINER_AMOUNT')).notVisible(),
			DTColumnBuilder.newColumn(null).withTitle(
					$translate('COMMON_CONTAINER_SINGLE_PRICE')).renderWith(
					function(data, type, full) {
						return $filter('currency')(
								data.lead.container.priceNetto, '€', 2);
					}).notVisible(),
			DTColumnBuilder.newColumn(null).withTitle(
					$translate('COMMON_CONTAINER_ENTIRE_PRICE'))
					.renderWith(
							function(data, type, full) {
								return $filter('currency')(data.lead.leadPrice,
										'€', 2);
							}).notVisible(),
			DTColumnBuilder.newColumn(null).withTitle(
					$translate('COMMON_STATUS')).withClass('text-center')
					.renderWith(addStatusStyle),
			DTColumnBuilder.newColumn(null).withTitle(
					'<span class="glyphicon glyphicon-cog"></span>').withClass(
					'text-center').notSortable().renderWith(addActionsButtons) ];

	if ($rootScope.language == 'de') {
		vm.dtOptions
				.withLanguageSource('/assets/datatablesTranslationFiles/German.json');
	} else {
		vm.dtOptions
				.withLanguageSource('/assets/datatablesTranslationFiles/English.json');
	}

	vm.refreshData = refreshData;
	function refreshData() {
		var resetPaging = false;
		this.dtInstance.reloadData(resetPaging);
	}

	vm.changeDataInput = changeDataInput;
	function changeDataInput() {
		if (vm.loadAllData == true) {
			vm.dtOptions.withOption('serverSide', true).withOption('ajax', {
				url : '/api/rest/processes/leads',
				type : 'GET',
				pages : 5,
				dataSrc : 'data',
				error : function(xhr, error, thrown) {
					console.log(xhr);
				}
			}).withOption('searchDelay', 500);
		} else {
			vm.dtOptions.withOption('serverSide', false).withOption('ajax', {
				url : '/api/rest/processes/workflow/LEAD/state/OPEN',
				error : function(xhr, error, thrown) {
					console.log(xhr);
				},
				type : 'GET'
			}).withOption('searchDelay', 0);
		}
	}

	function createdRow(row, data, dataIndex) {
		// Recompiling so we can bind Angular directive to the DT
		vm.rows[data.id] = row;
		var currentDate = moment(moment(), "DD.MM.YYYY");
		var leadDate = moment(data.lead.timestamp, "DD.MM.YYYY");
		if (currentDate.businessDiff(leadDate, 'days') > 3
				&& data.status == 'OPEN')
			$(row).addClass('important');
		vm.compile(angular.element(row).contents())(vm.scope);
	}

	function addActionsButtons(data, type, full, meta) {
		vm.processes[data.id] = data;
		var disabled = '';
		var disablePin = '';
		var hasRightToDelete = '';
		var closeOrOpenInquiryDisable = '';
		var openOrLock = $translate.instant('LEAD_CLOSE_LEAD');
		var faOpenOrLock = 'fa fa-lock';
		if (data.status != 'OPEN') {
			disabled = 'disabled';
			disablePin = 'disabled';
			openOrLock = $translate.instant('LEAD_OPEN_LEAD');
			faOpenOrLock = 'fa fa-unlock';
		}
		if (data.offer != null || data.sale != null) {
			closeOrOpenInquiryDisable = 'disabled';
		}
		if ($rootScope.globals.currentUser.role == 'user') {
			hasRightToDelete = 'disabled';
		}
		if (data.processor != null
				&& $rootScope.globals.currentUser.username != data.processor.username) {
			disablePin = 'disabled';
		}
		if (vm.windowWidth > 1300) {
			return '<div style="white-space: nowrap;"><button class="btn btn-white" '
					+ disabled
					+ ' ng-click="lead.createOffer(lead.processes['
					+ data.id
					+ '])" title="'
					+ $translate.instant('LEAD_FOLLOW_UP')
					+ '">'
					+ '   <i class="fa fa-check"></i>'
					+ '</button>&nbsp;'
					+ '<button class="btn btn-white" '
					+ disablePin
					+ ' ng-click="lead.pin(lead.processes['
					+ data.id
					+ '])" title="'
					+ $translate.instant('LEAD_PIN')
					+ '">'
					+ '   <i class="fa fa-thumb-tack"></i>'
					+ '</button>&nbsp;'
					+ '<button class="btn btn-white" '
					+ closeOrOpenInquiryDisable
					+ ' ng-click="lead.closeOrOpenInquiry(lead.processes['
					+ data.id
					+ '])" title="'
					+ openOrLock
					+ '">'
					+ '   <i class="'
					+ faOpenOrLock
					+ '"></i>'
					+ '</button>&nbsp;'
					+ '<button class="btn btn-white" '
					+ closeOrOpenInquiryDisable
					+ ' ng-click="lead.loadDataToModal(lead.processes['
					+ data.id
					+ '])" data-toggle="modal"'
					+ 'data-target="#editModal" title="'
					+ $translate.instant('LEAD_EDIT_LEAD')
					+ '">'
					+ '<i class="fa fa-edit"></i>'
					+ '</button>&nbsp;'
					+ '<button class="btn btn-white" '
					+ hasRightToDelete
					+ ' ng-click="lead.deleteRow(lead.processes['
					+ data.id
					+ '])" title="'
					+ $translate.instant('LEAD_DELETE_LEAD')
					+ '">'
					+ '   <i class="fa fa-trash-o"></i>'
					+ '</button></div>';
		} else {
			return '<div class="dropdown">'
					+ '<button class="btn btn-white dropdown-toggle" type="button" data-toggle="dropdown">'
					+ '<i class="fa fa-wrench"></i></button>'
					+ '<ul class="dropdown-menu pull-right">'
					+ '<li><button style="width: 100%; text-align: left;" class="btn btn-white" '
					+ disabled
					+ ' ng-click="lead.followUp(lead.processes['
					+ data.id
					+ '])"><i class="fa fa-check">&nbsp;</i>'
					+ $translate.instant('LEAD_FOLLOW_UP')
					+ '</button></li>'
					+ '<li><button style="width: 100%; text-align: left;" class="btn btn-white" '
					+ disablePin
					+ ' ng-click="lead.pin(lead.processes['
					+ data.id
					+ '])"><i class="fa fa-thumb-tack">&nbsp;</i>'
					+ $translate.instant('LEAD_PIN')
					+ '</button></li>'
					+ '<li><button style="width: 100%; text-align: left;" class="btn btn-white" '
					+ closeOrOpenInquiryDisable
					+ ' ng-click="lead.closeOrOpenInquiry(lead.processes['
					+ data.id
					+ '])"><i class="'
					+ faOpenOrLock
					+ '">&nbsp;</i>'
					+ openOrLock
					+ '</button></li>'
					+ '<li><button style="width: 100%; text-align: left;" class="btn btn-white" '
					+ closeOrOpenInquiryDisable
					+ ' data-toggle="modal" data-target="#editModal" ng-click="lead.loadDataToModal(lead.processes['
					+ data.id
					+ '])"><i class="fa fa-edit"">&nbsp;</i>'
					+ $translate.instant('LEAD_EDIT_LEAD')
					+ '</button></li>'
					+ '<li><button style="width: 100%; text-align: left;" class="btn btn-white" '
					+ hasRightToDelete
					+ ' ng-click="lead.deleteRow(lead.processes['
					+ data.id
					+ '])"><i class="fa fa-trash-o">&nbsp;</i>'
					+ $translate.instant('LEAD_DELETE_LEAD')
					+ '</button></li>'
					+ '</ul>' + '</div>'
		}
	}

	function addStatusStyle(data, type, full, meta) {
		vm.processes[data.id] = data;
		var hasProcessor = '';
		if (data.processor != null)
			hasProcessor = '&nbsp;<span style="color: #ea394c;"><i class="fa fa-thumb-tack"></i></span>';
		if (data.status == 'OPEN') {
			return '<span style="color: green;">'
					+ $translate.instant('COMMON_STATUS_OPEN') + '</span>'
					+ hasProcessor;
		} else if (data.status == 'OFFER') {
			return '<span style="color: #f79d3c;">'
					+ $translate.instant('COMMON_STATUS_OFFER') + '</span>'
		} else if (data.status == 'FOLLOWUP') {
			return '<span style="color: #f79d3c;">'
					+ $translate.instant('COMMON_STATUS_FOLLOW_UP') + '</span>'
		} else if (data.status == 'SALE') {
			return '<span style="color: #1872ab;">'
					+ $translate.instant('COMMON_STATUS_SALE') + '</span>'
		} else if (data.status == 'CLOSED') {
			return '<span style="color: #ea394c;">'
					+ $translate.instant('COMMON_STATUS_CLOSED') + '</span>'
		}
	}

	function addDetailButton(data, type, full, meta) {
		vm.processes[data.id] = data;
		return '<a class="green shortinfo" href="javascript:;"'
				+ 'ng-click="lead.appendChildRow(lead.processes[' + data.id
				+ '], $event)" title="Details">'
				+ '<i class="glyphicon glyphicon-plus-sign"/></a>';
	}
}

LeadsCtrl.prototype.appendChildRow = function(process, event) {
	var childScope = this.scope.$new(true);
	childScope.childData = process;
	var vm = this;
	this.commentResource.getByProcessId({
		id : process.id
	}).$promise.then(function(result) {
		vm.comments[process.id] = [];
		for ( var comment in result) {
			if (comment == '$promise')
				break;
			vm.comments[process.id].push({
				commentText : result[comment].commentText,
				timestamp : result[comment].timestamp,
				creator : result[comment].creator
			});
		}
	});
	childScope.parent = this;

	var link = angular.element(event.currentTarget), icon = link
			.find('.glyphicon'), tr = link.parent().parent(), table = this.dtInstance.DataTable, row = table
			.row(tr);

	if (row.child.isShown()) {
		icon.removeClass('glyphicon-minus-sign')
				.addClass('glyphicon-plus-sign');
		row.child.hide();
		tr.removeClass('shown');
	} else {
		icon.removeClass('glyphicon-plus-sign')
				.addClass('glyphicon-minus-sign');
		row.child(
				this.compile(
						'<div childrow type="lead" class="clearfix"></div>')(
						childScope)).show();
		tr.addClass('shown');
	}
};
