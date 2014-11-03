var tbUiLayout = angular.module('tbUiLayout', []);

tbUiLayout.directive('tbHsplitContainer', ['$window', '$document', '$log', function($window, $document, $log) {
	
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		controller: function($scope) {
			var self = this;
			self.setLeftPane = function(leftPane) {
				$scope.leftPane = leftPane;
			};
			self.setRightPane = function(rightPane) {
				$scope.rightPane = rightPane;
			};
			
			self.resizeStart = function() {
				$scope.leftPane.registerResizeHandler(resize);
				$scope.rightPane.registerResizeHandler(resize);
			};
			
			self.resizeComplete = function() {
				$scope.leftPane.unregisterResizeHandler(resize);
				$scope.rightPane.unregisterResizeHandler(resize);
			};
			
			self.moveSplitBar = function(newSplitBarLocation) {
				$scope.leftPane.updateResizeLocation(newSplitBarLocation);
				$scope.rightPane.updateResizeLocation(newSplitBarLocation);
				
				if ($scope.saveLocation == 'true') {
					$window.localStorage.viewContainerSplit = newSplitBarLocation;
				}
			};
			
			function resize(mouseEvent) {
				
				var currentMouseX = mouseEvent.clientX;
				var newSplitBarX = currentMouseX-3; // this is needed to ensure we are still hovering when we move left
				$log.debug('New diff = ' + newSplitBarX);
				
				self.moveSplitBar(newSplitBarX);
			}
		},
		template: '<div ng-transclude></div>',
		link: function(scope, element, attr) {
			
			var id = attr['id'];
			if (!id) {
				var errorMessage = "tbVsplitContainer is missing an id";
				$log.error(errorMessage);
				throw errorMessage;
			}
			scope.containerId = id;
			var saveLocation = attr['saveLocation'] || 'false';
			
			if (!attr['class']) {
				element.addClass('view-container');
			}
			
			
			scope.widthCalculationMode = (attr['widthCalculation']) ? attr['widthCalculation'] : 'fixed';
			if (scope.widthCalculationMode == 'fixed') {
				scope.defaultSplit = (attr['defaultSplit']) ? attr['defaultSplit'] : 350;
				scope.widthCalculationUnit = 'px';
			} else if (scope.widthCalculationMode == 'ratio') {
				scope.defaultSplit = (attr['defaultSplit']) ? attr['defaultSplit'] : 35;
				scope.widthCalculationUnit = '%';
				if (scope.defaultSplit > 99) {
					scope.defaultSplit = 35;
				}
			} else {
				var errorMessage = "tbVsplitContainer contains invalid width-calculation value of " + attr['widthCalcuation'];
				$log.error(errorMessage);
				throw errorMessage;
			}
			
			var viewContainerSplit = scope.defaultSplit;
			if ($window.localStorage.viewContainerSplit && saveLocation == 'true') {
				viewContainerSplit = $window.localStorage.viewContainerSplit;
			}
			
			scope.viewContainerSplit = viewContainerSplit;
			$log.debug('viewContainerSplit location is ' + viewContainerSplit);
			
			element.css('top', '50px').css('left', '0px').css('bottom', '0px').css('right', '0px')
				   .addClass('noselect');
			angular.element($window).on('resize', function(resizeEvent) {
				$log.debug('Window resized - this container now has width of ' + element.outerWidth());
			});
		}
	};
}]);

tbUiLayout.directive('tbLeftPane', ['$document', '$log', function($document, $log) {
	return {
		require: '^tbHsplitContainer',
		transclude: true,
		replace: true,
		scope: true,
		link: function(scope, element, attr, parentController) {
			
			if (scope.viewContainerSplit) {
				
				parentController.setLeftPane(scope);
				
				if (!attr['class']) {
					element.addClass('view-container-left');
				}
				
				$log.debug('tbLeftPane viewContainerSplit location is ' + scope.viewContainerSplit);
				
				function extractPixelValue(valueWithPx) {
					if (valueWithPx.indexOf('px') <= 0) {
						return 0;
					}
					return valueWithPx.substring(0, valueWithPx.indexOf('px'));
				}
				
				/* Now we need to calculate the target widht (accounting for padding that will be added through CSS) */
				var paddingCompensation = 0;
				var compensationSources = ['padding-left', 'padding-right', 'border-left-width', 'border-right-width'];
				for (var compensationIndex = 0; compensationIndex < compensationSources.length; ++compensationIndex) {
					sourceValue = element.css(compensationSources[compensationIndex]);
					paddingCompensation += ((sourceValue) ? parseInt(extractPixelValue(sourceValue)) : 0);
				}

				var elementWidth = scope.viewContainerSplit - paddingCompensation;
				element.css('top', '0px').css('left', '0px').css('bottom', '0px').width(elementWidth + 'px');
				
				/* Now define our callback functions for the resizing */
				scope.registerResizeHandler = function(mousemoveHandler) {
					element.on('mousemove', mousemoveHandler);
				};
				
				scope.unregisterResizeHandler = function(mousemoveHandler) {
					element.off('mousemove', mousemoveHandler);
				};
				
				scope.updateResizeLocation = function(newSplitBarLocation) {
					var selectionContainer = element;
					selectionContainer.css({
						width: newSplitBarLocation + 'px'
					});
				};
			}
		},
		template: '<div ng-transclude></div>'
	};
}]);

tbUiLayout.directive('tbRightPane', ['$document', '$log', '$window', function($document, $log) {
	return {
		require: '^tbHsplitContainer',
		transclude: true,
		replace: true,
		scope: true,
		link: function(scope, element, attr, parentController) {
			
			if (scope.viewContainerSplit) {
				
				var splitBarCssSelector = '#' + scope.containerId + ' .split-bar';
				
				parentController.setRightPane(scope);
				
				if (!attr['class']) {
					element.addClass('view-container-right');
				}
				
				$log.debug('parent width is ' + element.parent().outerWidth());
				$log.debug('tbRightPane viewContainerSplit location is ' + scope.viewContainerSplit);
				$log.debug('padding - ' + element.css('padding-left') + ',' + element.css('padding-right'));
				element.css('top', '0px').css('left', scope.viewContainerSplit + 'px').css('bottom', '0px').css('right', '0px');
				
				var splitBar = $('<div>').attr('class', 'split-bar');
				splitBar.css('top', '0px').css('left', scope.viewContainerSplit + 'px').css('bottom', '0px').width('8px');
				
				element.after(splitBar);
				
				var offset = 0;
				splitBar.on('mousedown', function(mouseEvent) {
					mouseEvent.preventDefault();
					var mouseX = mouseEvent.clientX;
					var assetContainerX = splitBar.position().left;
					offset = mouseX - assetContainerX;
					
					$log.debug('Offset between mouse and left side of container is ' + offset);
					
					splitBar.addClass('mousedown');
					
					parentController.resizeStart();
				});
				
				scope.registerResizeHandler = function(mousemoveHandler) {
					element.on('mousemove', mousemoveHandler);
					var splitBar = $(splitBarCssSelector);
					splitBar.on('mousemove', mousemoveHandler);
					
					splitBar.on('mouseup', mouseup);
				};
				
				scope.unregisterResizeHandler = function(mousemoveHandler) {
					element.off('mousemove', mousemoveHandler);
					var splitBar = $(splitBarCssSelector);
					splitBar.off('mousemove', mousemoveHandler);
					splitBar.off('mouseup', mouseup);
					splitBar.removeClass('mousedown');
				};
				
				scope.updateResizeLocation = function(newSplitBarLocation) {
					var assetContainer = element;
					var splitBar = $(splitBarCssSelector);
					assetContainer.css({
						left : newSplitBarLocation + 'px'
					});
					splitBar.css({
						left : newSplitBarLocation + 'px'
					});
				};
				
				function mouseup(mouseEvent) {
					parentController.resizeComplete();
				}
			}
		},
		template: '<div ng-transclude></div>'
	};
}]);