package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.OrderRequest;
import com.E_Commerce.demo.dto.response.OrderDto;
import com.E_Commerce.demo.entity.*;
import com.E_Commerce.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;

    public List<OrderDto> getAll() {
        return orderRepository.findAll().stream().map(OrderDto::from).toList();
    }

    public OrderDto getById(Long id) {
        return OrderDto.from(orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id)));
    }

    public OrderDto getById(Long id, String callerEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        ensureCanReadOrder(getCaller(callerEmail), order);
        return OrderDto.from(order);
    }

    public List<OrderDto> getByUser(Long userId) {
        return orderRepository.findByUserId(userId).stream().map(OrderDto::from).toList();
    }

    public List<OrderDto> getByUser(Long userId, String callerEmail) {
        User caller = getCaller(callerEmail);
        if (caller.getRoleType() != User.RoleType.ADMIN && !caller.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own orders");
        }
        return getByUser(userId);
    }

    public List<OrderDto> getByUserEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return orderRepository.findByUserId(user.getId()).stream().map(OrderDto::from).toList();
    }

    public List<OrderDto> getByStore(Long storeId) {
        return orderRepository.findByStoreId(storeId).stream().map(OrderDto::from).toList();
    }

    public List<OrderDto> getByStore(Long storeId, String callerEmail) {
        User caller = getCaller(callerEmail);
        if (caller.getRoleType() != User.RoleType.ADMIN && !ownsStore(caller, storeId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access orders for your own stores");
        }
        return getByStore(storeId);
    }

    public List<OrderDto> getByStatus(String status) {
        return orderRepository.findByStatus(Order.OrderStatus.valueOf(status)).stream().map(OrderDto::from).toList();
    }

    @Transactional
    public OrderDto create(OrderRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
        Store store = request.getStoreId() != null
                ? storeRepository.findById(request.getStoreId())
                        .orElseThrow(() -> new RuntimeException("Store not found: " + request.getStoreId()))
                : null;

        Order order = Order.builder()
                .user(user)
                .store(store)
                .paymentMethod(request.getPaymentMethod())
                .discount(request.getDiscount() != null ? request.getDiscount() : 0.0)
                .tax(request.getTax() != null ? request.getTax() : 0.0)
                .shippingCost(request.getShippingCost() != null ? request.getShippingCost() : 0.0)
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .grandTotal(0.0)
                .build();
        order = orderRepository.save(order);

        double total = 0.0;
        List<OrderItem> items = new ArrayList<>();

        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + itemReq.getProductId()));
            double itemDiscount = itemReq.getDiscount() != null ? itemReq.getDiscount() : 0.0;
            double itemTotal = product.getUnitPrice() * itemReq.getQuantity() * (1 - itemDiscount);
            total += itemTotal;
            OrderItem item = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .price(product.getUnitPrice())
                    .discount(itemDiscount)
                    .build();
            items.add(orderItemRepository.save(item));
        }

        order.setGrandTotal(total + order.getTax() + order.getShippingCost() - order.getDiscount());
        order.setItems(items);
        return OrderDto.from(orderRepository.save(order));
    }

    @Transactional
    public OrderDto updateStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        order.setStatus(Order.OrderStatus.valueOf(status));
        OrderDto saved = OrderDto.from(orderRepository.save(order));
        String userEmail = order.getUser().getEmail();
        notificationService.sendOrderStatusUpdate(id, status, userEmail);
        return saved;
    }

    @Transactional
    public OrderDto updateStatus(Long id, String status, String callerEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        ensureCanManageOrder(getCaller(callerEmail), order);
        order.setStatus(Order.OrderStatus.valueOf(status));
        OrderDto saved = OrderDto.from(orderRepository.save(order));
        notificationService.sendOrderStatusUpdate(id, status, order.getUser().getEmail());
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        orderRepository.deleteById(id);
    }

    private User getCaller(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private void ensureCanReadOrder(User caller, Order order) {
        if (caller.getRoleType() == User.RoleType.ADMIN
                || order.getUser().getId().equals(caller.getId())
                || (order.getStore() != null && ownsStore(caller, order.getStore().getId()))) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this order");
    }

    private void ensureCanManageOrder(User caller, Order order) {
        if (caller.getRoleType() == User.RoleType.ADMIN
                || (order.getStore() != null && ownsStore(caller, order.getStore().getId()))) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage this order");
    }

    private boolean ownsStore(User caller, Long storeId) {
        return caller.getRoleType() == User.RoleType.CORPORATE
                && storeRepository.findByOwnerId(caller.getId()).stream()
                        .anyMatch(store -> store.getId().equals(storeId));
    }
}
