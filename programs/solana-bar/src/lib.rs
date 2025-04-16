use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("barqFQ2m1YsNTQwfj3hnEN7svuppTa6V2hKAHPpBiX9");

const SOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

#[event]
pub struct ShotPurchased {
    pub buyer: Pubkey,
    pub product_name: String,
    pub price: u64,
    pub timestamp: i64,
    pub table_number: u8,
    pub receipt_id: u64,
    pub telegram_channel_id: String,
    pub bar_name: String,
    pub receipts_account: Pubkey,
}

#[error_code]
pub enum ShotErrorCode {
    #[msg("InvalidTreasury")]
    InvalidTreasury,
    #[msg("ProductAlreadyExists")]
    ProductAlreadyExists,
    #[msg("ProductNotFound")]
    ProductNotFound,
    #[msg("InvalidMint")]
    InvalidMint,
    #[msg("InvalidAuthority")]
    InvalidAuthority,
    #[msg("BarNotEmpty")]
    BarNotEmpty,
    #[msg("ProductNameEmpty")]
    ProductNameEmpty,
}

#[program]
pub mod solana_bar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, bar_name: String) -> Result<()> {
        ctx.accounts.receipts.bar_name = bar_name.clone();
        ctx.accounts.receipts.authority = *ctx.accounts.authority.key;
        ctx.accounts.receipts.telegram_channel_id = String::new(); // Initialize as empty
        Ok(())
    }

    pub fn update_telegram_channel(
        ctx: Context<UpdateTelegramChannel>,
        bar_name: String,
        telegram_channel_id: String,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            ShotErrorCode::InvalidAuthority
        );

        ctx.accounts.receipts.telegram_channel_id = telegram_channel_id;
        Ok(())
    }

    pub fn add_product(
        ctx: Context<AddProduct>,
        bar_name: String,
        name: String,
        price: u64,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            ShotErrorCode::InvalidAuthority
        );

        // Check if product name is empty
        require!(!name.trim().is_empty(), ShotErrorCode::ProductNameEmpty);

        // Check if product with same mint already exists
        for product in &ctx.accounts.receipts.products {
            if product.name == name {
                return Err(ShotErrorCode::ProductAlreadyExists.into());
            }
        }

        // Add new product
        ctx.accounts.receipts.products.push(Products {
            name,
            price,
            decimals: ctx.accounts.mint.decimals,
            mint: ctx.accounts.mint.key(),
        });

        Ok(())
    }

    pub fn buy_shot(
        ctx: Context<BuyShot>,
        bar_name: String,
        product_name: String,
        table_number: u8,
    ) -> Result<()> {
        // Find the product and verify the mint matches
        let product = ctx
            .accounts
            .receipts
            .products
            .iter()
            .find(|p| p.name == product_name)
            .ok_or(ShotErrorCode::ProductNotFound)?;

        require!(
            product.mint == ctx.accounts.mint.key(),
            ShotErrorCode::InvalidMint
        );

        let price = product.price;
        let decimals = product.decimals;
        let name = product.name.clone();
        let is_sol = product.mint == SOL_MINT;

        // Add a new receipt to the receipts account.
        let receipt_id = ctx.accounts.receipts.total_shots_sold;
        ctx.accounts.receipts.receipts.push(Receipt {
            buyer: *ctx.accounts.signer.key,
            was_delivered: false,
            price,
            timestamp: Clock::get()?.unix_timestamp,
            receipt_id,
            table_number,
            product_name: name.clone(),
        });

        let len = ctx.accounts.receipts.receipts.len();
        if len >= 10 {
            ctx.accounts.receipts.receipts.remove(0);
        }

        // Increment the total shots sold.
        ctx.accounts.receipts.total_shots_sold = ctx
            .accounts
            .receipts
            .total_shots_sold
            .checked_add(1)
            .unwrap();

        // If mint is SOL, use system program transfer
        if is_sol {
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.signer.to_account_info().clone(),
                    to: ctx.accounts.authority.to_account_info().clone(),
                },
            );
            system_program::transfer(cpi_context, price)?;
        } else {
            // Otherwise use token transfer
            let cpi_accounts = TransferChecked {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

            token::transfer_checked(cpi_context, price, decimals)?;
        }

        // Emit the purchase event
        emit!(ShotPurchased {
            buyer: *ctx.accounts.signer.key,
            product_name: name,
            price,
            timestamp: Clock::get()?.unix_timestamp,
            table_number,
            receipt_id,
            telegram_channel_id: ctx.accounts.receipts.telegram_channel_id.clone(),
            bar_name: ctx.accounts.receipts.bar_name.clone(),
            receipts_account: ctx.accounts.receipts.key(),
        });

        Ok(())
    }

    pub fn mark_shot_as_delivered(
        ctx: Context<MarkShotAsDelivered>,
        _bar_name: String,
        recipe_id: u64,
    ) -> Result<()> {
        msg!("Marked shot as delivered");
        for i in 0..ctx.accounts.receipts.receipts.len() {
            msg!("Marked shot as delivered  {}", i);
            if ctx.accounts.receipts.receipts[i].receipt_id == recipe_id {
                msg!("Marked shot as delivered {} {} ", recipe_id, i);
                ctx.accounts.receipts.receipts[i].was_delivered = true;
            }
        }
        Ok(())
    }

    pub fn delete_product(
        ctx: Context<DeleteProduct>,
        bar_name: String,
        product_name: String,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            ShotErrorCode::InvalidAuthority
        );

        // Find and remove the product
        let products = &mut ctx.accounts.receipts.products;
        let index = products
            .iter()
            .position(|p| p.name == product_name)
            .ok_or(ShotErrorCode::ProductNotFound)?;

        products.remove(index);

        Ok(())
    }

    pub fn delete_bar(ctx: Context<DeleteBar>, bar_name: String) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            ShotErrorCode::InvalidAuthority
        );

        // Probably not necessary to delete all products before deleting the bar
        // require!(
        //     ctx.accounts.receipts.products.is_empty(),
        //     ShotErrorCode::BarNotEmpty
        // );

        // Close the account and send rent to authority
        let authority = ctx.accounts.authority.to_account_info();
        let receipts = ctx.accounts.receipts.to_account_info();
        let dest_starting_lamports = authority.lamports();
        **authority.lamports.borrow_mut() = dest_starting_lamports
            .checked_add(receipts.lamports())
            .unwrap();
        **receipts.lamports.borrow_mut() = 0;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bar_name: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 4 + 4 + (4 + 32 + 8 + 1 + 32) * 10 + (4 + 32 + 1 + 8 + 8 + 4 + 32) * 10 + 4 + 32,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, telegram_channel_id: String)]
pub struct UpdateTelegramChannel<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, name: String, price: u64)]
pub struct AddProduct<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, product_name: String, table_number: u8)]
pub struct BuyShot<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, recipe_id: u64)]
pub struct MarkShotAsDelivered<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, product_name: String)]
pub struct DeleteProduct<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bar_name: String)]
pub struct DeleteBar<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump,
        close = authority
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account()]
pub struct Receipts {
    pub receipts: Vec<Receipt>,
    pub total_shots_sold: u64,
    pub bar_name: String,
    pub authority: Pubkey,
    pub products: Vec<Products>,
    pub telegram_channel_id: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Products {
    pub price: u64,
    pub decimals: u8,
    pub mint: Pubkey,
    pub name: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Receipt {
    pub receipt_id: u64,
    pub buyer: Pubkey,
    pub was_delivered: bool,
    pub price: u64,
    pub timestamp: i64,
    pub table_number: u8,
    pub product_name: String,
}
